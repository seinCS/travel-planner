# Claude Code 협업 환경 설계 문서

> 작성일: 2026-01-20
> 참조: Anthropic 공식 문서, 최신 AI CI/CD 트렌드

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          개발자 로컬 환경                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Claude Code  │◄──►│  MCP Servers │◄──►│   VS Code    │                   │
│  │   Terminal   │    │              │    │   / IDE      │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘                   │
│         │                   │                                                │
│         │    ┌──────────────┼──────────────┐                                │
│         │    │              │              │                                 │
│         ▼    ▼              ▼              ▼                                 │
│  ┌────────────────┐ ┌─────────────┐ ┌─────────────┐                         │
│  │ GitHub MCP    │ │ Jira MCP    │ │ Filesystem  │                         │
│  │ (git ops)     │ │ (tickets)   │ │ MCP         │                         │
│  └───────┬────────┘ └──────┬──────┘ └─────────────┘                         │
└──────────┼─────────────────┼────────────────────────────────────────────────┘
           │                 │
           ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│     GitHub       │  │   Jira Cloud     │
│   Repository     │  │   / Server       │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions CI/CD                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ PR Review       │  │ Issue Triage    │  │ Code Generation │             │
│  │ (claude-code-   │  │ (@claude        │  │ (scheduled/     │             │
│  │  action)        │  │  mention)       │  │  manual)        │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트별 설계

### 2.1 GitHub Actions + Claude Code Action

#### 워크플로우 파일 구조

```
.github/
├── workflows/
│   ├── claude.yml              # 메인 Claude 워크플로우
│   ├── claude-pr-review.yml    # PR 리뷰 전용
│   └── claude-issue-triage.yml # 이슈 분류 전용
└── CODEOWNERS                  # Claude 멘션 관리
```

#### 메인 워크플로우 설계 (`.github/workflows/claude.yml`)

```yaml
name: Claude Code Assistant

on:
  # PR 관련 트리거
  pull_request:
    types: [opened, synchronize, reopened]

  # 이슈/댓글 트리거 (@claude 멘션)
  issue_comment:
    types: [created]
  issues:
    types: [opened, assigned]

  # PR 리뷰 코멘트
  pull_request_review_comment:
    types: [created]

# 동시 실행 제어 (같은 PR에서 중복 실행 방지)
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.event.issue.number || github.ref }}
  cancel-in-progress: true

jobs:
  claude-assistant:
    # 봇 코멘트 무시, @claude 멘션 또는 PR 이벤트만 처리
    if: |
      (github.event_name == 'pull_request') ||
      (github.event_name == 'issues' && github.event.action == 'opened') ||
      (contains(github.event.comment.body, '@claude') &&
       github.event.comment.user.type != 'Bot')

    runs-on: ubuntu-latest

    permissions:
      contents: write
      pull-requests: write
      issues: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 전체 히스토리 (diff 분석용)

      - name: Run Claude Code Action
        uses: anthropics/claude-code-action@v1
        with:
          # 인증 (택 1)
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          # 또는 OAuth: claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

          # GitHub 토큰
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # 모델 설정 (선택)
          model: "claude-sonnet-4-20250514"

          # 커스텀 프롬프트 (선택)
          custom_instructions: |
            이 프로젝트는 Next.js 기반 여행 플래너입니다.
            - TypeScript, Tailwind CSS 사용
            - Prisma ORM, Supabase 백엔드
            - 한국어 응답 선호

          # 허용 도구
          allowed_tools: |
            Read
            Glob
            Grep
            Edit
            Write
            Bash(npm:*)
            Bash(npx:*)
```

#### PR 코드 리뷰 전용 워크플로우

```yaml
# .github/workflows/claude-pr-review.yml
name: Claude PR Review

on:
  pull_request:
    types: [opened, synchronize]
    paths:
      # 중요 파일 변경 시만 리뷰
      - 'app/**/*.ts'
      - 'app/**/*.tsx'
      - 'lib/**/*.ts'
      - 'prisma/schema.prisma'

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # 리뷰 전용 프롬프트
          prompt: |
            이 PR의 변경사항을 검토해주세요:

            ## 검토 항목
            1. 코드 품질 및 가독성
            2. TypeScript 타입 안전성
            3. 보안 취약점 (OWASP Top 10)
            4. 성능 이슈
            5. 테스트 커버리지

            ## 형식
            - 심각도별 분류 (Critical/Warning/Info)
            - 구체적인 라인 번호와 개선 제안
            - 한국어로 응답
```

---

### 2.2 MCP 서버 설정

#### 2.2.1 Atlassian (Jira/Confluence) MCP

**설정 파일 위치**: 프로젝트 루트 `.mcp.json` (팀 공유용)

```json
{
  "mcpServers": {
    "atlassian": {
      "transport": "sse",
      "url": "https://mcp.atlassian.com/v1/sse",
      "scope": "project",
      "description": "Jira/Confluence 연동"
    }
  }
}
```

**또는 로컬 MCP 서버 사용** (더 안정적):

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["--python=3.12", "mcp-atlassian"],
      "env": {
        "JIRA_URL": "${JIRA_URL}",
        "JIRA_USERNAME": "${JIRA_USERNAME}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "CONFLUENCE_URL": "${CONFLUENCE_URL}",
        "CONFLUENCE_USERNAME": "${CONFLUENCE_USERNAME}",
        "CONFLUENCE_API_TOKEN": "${CONFLUENCE_API_TOKEN}"
      }
    }
  }
}
```

#### 2.2.2 GitHub MCP (Docker MCP Toolkit 활용)

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_TOKEN",
        "mcp/github"
      ],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

#### 2.2.3 통합 MCP 설정 예시

```json
{
  "mcpServers": {
    "atlassian-sse": {
      "transport": "sse",
      "url": "https://mcp.atlassian.com/v1/sse",
      "scope": "project"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"]
    }
  }
}
```

---

### 2.3 Git 워크플로우 설계

#### 브랜치 전략 (GitHub Flow + Claude)

```
main (보호됨)
  │
  ├── feature/JIRA-123-add-login ──► PR ──► Claude Review ──► Merge
  │
  ├── fix/JIRA-456-bug-fix ──► PR ──► Claude Review ──► Merge
  │
  └── claude/auto-fix-JIRA-789 ──► (Claude가 자동 생성한 브랜치)
```

#### CLAUDE.md 업데이트 (Git 규칙 추가)

```markdown
## Git Workflow

### Branch Naming
- feature/{JIRA-ID}-{description}
- fix/{JIRA-ID}-{description}
- refactor/{JIRA-ID}-{description}

### Commit Message Format
```
[JIRA-123] type: description

- detail 1
- detail 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

### PR Guidelines
- PR 제목: [JIRA-123] 기능 설명
- PR 본문: 템플릿 사용 필수
- @claude 멘션으로 코드 리뷰 요청 가능
```

---

### 2.4 Jira 연동 설계

#### 자동화 워크플로우

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Jira Ticket    │────►│  Claude Code    │────►│  GitHub PR      │
│  생성/할당      │     │  (MCP 통해 조회) │     │  자동 생성      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Status:        │     │  코드 구현      │     │  Jira 상태      │
│  In Progress    │     │  테스트 실행    │     │  자동 업데이트  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Claude Code 커스텀 명령어 (`.claude/commands/`)

**`.claude/commands/jira-start.md`**:
```markdown
# Jira 티켓 작업 시작

이 명령어는 Jira 티켓을 기반으로 작업을 시작합니다.

## 입력
$ARGUMENTS (Jira 티켓 ID, 예: TRAVEL-123)

## 실행 단계
1. MCP를 통해 Jira 티켓 정보 조회
2. 티켓 내용을 기반으로 작업 계획 수립
3. feature/{ticket-id}-{summary} 브랜치 생성
4. 구현 시작

## 출력
- 작업 계획 요약
- 생성된 브랜치 정보
```

**`.claude/commands/jira-done.md`**:
```markdown
# Jira 티켓 작업 완료

## 입력
$ARGUMENTS (Jira 티켓 ID)

## 실행 단계
1. 변경 사항 커밋 (Jira ID 포함)
2. PR 생성
3. Jira 티켓 상태를 "Code Review"로 변경
4. PR 링크를 Jira 티켓에 코멘트로 추가
```

---

## 3. 보안 설계

### 3.1 시크릿 관리

```yaml
# GitHub Repository Secrets 필수 항목
ANTHROPIC_API_KEY: sk-ant-...        # Claude API
JIRA_API_TOKEN: ...                   # Jira 연동
JIRA_URL: https://xxx.atlassian.net
JIRA_USERNAME: email@company.com
```

### 3.2 권한 최소화 원칙

```yaml
# GitHub Actions 권한
permissions:
  contents: write      # 코드 수정
  pull-requests: write # PR 생성/코멘트
  issues: write        # 이슈 코멘트
  # actions: read      # 필요시만
  # packages: read     # 필요시만
```

### 3.3 Claude 도구 제한

```yaml
# 위험한 도구 제한
allowed_tools: |
  Read
  Glob
  Grep
  Edit
  Write
  Bash(npm:*)
  Bash(npx:*)
  # Bash(*) - 전체 bash 허용 X

disallowed_tools: |
  Bash(rm:*)
  Bash(curl:*)
  Bash(wget:*)
```

---

## 4. 구현 체크리스트

### Phase 1: 기본 설정
- [ ] GitHub App 설치 (`/install-github-app` 또는 수동)
- [ ] `ANTHROPIC_API_KEY` 시크릿 추가
- [ ] `.github/workflows/claude.yml` 생성
- [ ] CLAUDE.md Git 규칙 업데이트

### Phase 2: MCP 연동
- [ ] `.mcp.json` 파일 생성
- [ ] Jira API 토큰 발급
- [ ] Atlassian MCP 연결 테스트
- [ ] 커스텀 명령어 (`.claude/commands/`) 생성

### Phase 3: 고급 자동화
- [ ] PR 자동 리뷰 워크플로우
- [ ] 이슈 자동 분류 워크플로우
- [ ] Jira-GitHub 양방향 연동
- [ ] 정기 코드 품질 점검 (scheduled)

---

## 5. 참고 자료

### 공식 문서
- [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions)
- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

### MCP 서버
- [mcp-atlassian (Jira/Confluence)](https://github.com/sooperset/mcp-atlassian)
- [Docker MCP Toolkit](https://www.docker.com/blog/add-mcp-servers-to-claude-code-with-mcp-toolkit/)
- [Atlassian Remote MCP Server](https://www.atlassian.com/blog/announcements/remote-mcp-server)

### 추가 참고
- [AI Coding Workflow 2026](https://addyosmani.com/blog/ai-coding-workflow/)
- [Best AI Coding Agents 2026](https://www.faros.ai/blog/best-ai-coding-agents-2026)
