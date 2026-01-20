# Claude Code 협업 환경 설정 가이드

> 작성일: 2026-01-20
> 상태: 구현 완료 (워크플로우 push 대기)

---

## 구현 완료 항목

### 1. GitHub Actions 워크플로우

| 파일 | 용도 | 트리거 |
|------|------|--------|
| `.github/workflows/claude.yml` | 메인 Claude 어시스턴트 | PR, Issue, @claude 멘션 |
| `.github/workflows/claude-pr-review.yml` | 자동 코드 리뷰 | PR 생성/업데이트 (ts, tsx 파일) |
| `.github/workflows/claude-issue-triage.yml` | 이슈 자동 분류 | 새 이슈 생성 |

### 2. MCP 서버 설정 (`.mcp.json`)

```json
{
  "mcpServers": {
    "supabase": { "type": "http", "url": "https://mcp.supabase.com/mcp" },
    "atlassian": { "command": "uvx", "args": ["--python=3.12", "mcp-atlassian"] },
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"] }
  }
}
```

### 3. Claude 커스텀 명령어 (`.claude/commands/`)

| 명령어 | 용도 |
|--------|------|
| `/project:jira-start {ID}` | Jira 티켓 기반 작업 시작, 브랜치 생성 |
| `/project:jira-done {ID}` | 작업 완료, PR 생성, Jira 업데이트 |
| `/project:jira-review {ID}` | 코드 리뷰, 요구사항 검증 |

### 4. Git 워크플로우 규칙 (CLAUDE.md)

- **브랜치 네이밍**: `feature/{JIRA-ID}-{description}`
- **커밋 메시지**: `[JIRA-ID] type: description`
- **PR 규칙**: 템플릿 필수, @claude 리뷰 가능

### 5. GitHub 설정 파일

- `.github/CODEOWNERS`: 자동 리뷰어 할당
- `.github/PULL_REQUEST_TEMPLATE.md`: PR 작성 템플릿
- `.github/ISSUE_TEMPLATE/`: 버그/기능 요청 템플릿

---

## 남은 설정 작업

### 1. GitHub 워크플로우 Push (필수)

토큰에 `workflow` 권한이 필요합니다.

**방법 A: 토큰 업데이트**
1. https://github.com/settings/tokens
2. 토큰 편집 → `workflow` 체크
3. `git push` 실행

**방법 B: SSH 사용**
```bash
git remote set-url origin git@github.com:seinCS/travel-planner.git
git push
```

**방법 C: GitHub 웹 업로드**
1. https://github.com/seinCS/travel-planner
2. Add file → Upload files
3. `.github/workflows/` 폴더의 3개 yml 파일 업로드

### 2. GitHub Secrets 설정 (필수)

Repository → Settings → Secrets and variables → Actions

| Secret Name | 값 |
|-------------|-----|
| `ANTHROPIC_API_KEY` | 새로 발급받은 Claude API 키 |

### 3. Jira 연동 (선택사항)

Jira를 사용하는 경우 환경변수 설정:

```bash
export JIRA_URL="https://your-domain.atlassian.net"
export JIRA_USERNAME="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
```

Jira API 토큰 발급: https://id.atlassian.com/manage-profile/security/api-tokens

### 4. Branch Protection (권장)

Repository → Settings → Branches → Add rule

- Branch name pattern: `main`
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Include administrators

---

## 사용 방법

### PR에서 Claude 코드 리뷰 요청
```
@claude 이 코드 리뷰해줘
```

### 이슈에서 Claude 도움 요청
```
@claude 이 버그 원인 분석해줘
```

### 로컬에서 Jira 작업 시작
```bash
# Claude Code에서
/project:jira-start TRAVEL-123
```

### 작업 완료 및 PR 생성
```bash
# Claude Code에서
/project:jira-done TRAVEL-123
```

---

## 트러블슈팅

### 워크플로우가 실행되지 않음
- Secrets 설정 확인 (`ANTHROPIC_API_KEY`)
- 워크플로우 파일이 push 되었는지 확인
- GitHub Actions 탭에서 로그 확인

### MCP 서버 연결 실패
- 환경변수 설정 확인
- uvx/npx 설치 확인: `pip install uv`, `npm install -g npx`

### @claude 멘션이 작동하지 않음
- 봇 계정이 아닌지 확인
- 워크플로우의 `if` 조건 확인
