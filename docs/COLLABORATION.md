# Claude Code 협업 환경

> 최종 업데이트: 2026-01-20
> 상태: ✅ 구현 완료

---

## 개요

이 프로젝트는 Claude Code와 GitHub Actions를 활용한 AI 협업 개발 환경이 구축되어 있습니다.

**GitHub Repository**: https://github.com/seinCS/travel-planner

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      개발자 로컬 환경                            │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code Terminal ◄──► MCP Servers ◄──► VS Code / IDE      │
│         │                      │                                │
│         ▼                      ▼                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Supabase    │  │ Atlassian   │  │ GitHub      │             │
│  │ MCP         │  │ (Jira) MCP  │  │ MCP         │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                          │
├─────────────────────────────────────────────────────────────────┤
│  PR Review (claude.yml)  │  Issue Triage  │  @claude 멘션 지원  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 구현된 기능

### 1. GitHub Actions 워크플로우

| 파일 | 용도 | 트리거 |
|------|------|--------|
| `claude.yml` | 메인 Claude 어시스턴트 | PR, Issue, `@claude` 멘션 |
| `claude-pr-review.yml` | 자동 코드 리뷰 | PR 생성/업데이트 (ts, tsx 파일) |
| `claude-issue-triage.yml` | 이슈 자동 분류 | 새 이슈 생성 |

**위치**: `.github/workflows/`

### 2. MCP 서버 설정

**파일**: `.mcp.json`

| 서버 | 용도 |
|------|------|
| `supabase` | 데이터베이스/스토리지 관리 |
| `atlassian` | Jira 티켓 연동 (선택) |
| `github` | GitHub 작업 자동화 |
| `filesystem` | 로컬 파일 시스템 접근 |

### 3. Claude 커스텀 명령어

**위치**: `.claude/commands/`

| 명령어 | 설명 |
|--------|------|
| `/project:jira-start {ID}` | Jira 티켓 기반 작업 시작, 브랜치 생성, 상태 업데이트 |
| `/project:jira-done {ID}` | 작업 완료, 커밋, PR 생성, Jira 상태 업데이트 |
| `/project:jira-review {ID}` | 요구사항 대비 코드 리뷰 |

### 4. Git 워크플로우

**브랜치 네이밍**:
```
feature/{JIRA-ID}-{description}
fix/{JIRA-ID}-{description}
refactor/{JIRA-ID}-{description}
docs/{JIRA-ID}-{description}
```

**커밋 메시지**:
```
[JIRA-ID] type: description

- detail 1
- detail 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 5. GitHub 템플릿

| 파일 | 용도 |
|------|------|
| `CODEOWNERS` | 자동 리뷰어 할당 |
| `PULL_REQUEST_TEMPLATE.md` | PR 작성 가이드 |
| `ISSUE_TEMPLATE/bug_report.md` | 버그 리포트 양식 |
| `ISSUE_TEMPLATE/feature_request.md` | 기능 요청 양식 |

---

## 사용 방법

### GitHub에서 Claude 사용

**PR 코드 리뷰 요청**:
```
@claude 이 코드 리뷰해줘
```

**이슈에서 도움 요청**:
```
@claude 이 버그 원인 분석해줘
```

### 로컬에서 Jira 연동 (선택)

```bash
# 작업 시작
/project:jira-start TRAVEL-123

# 작업 완료
/project:jira-done TRAVEL-123
```

---

## 설정 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| GitHub Repository | ✅ 완료 | seinCS/travel-planner |
| GitHub Actions | ✅ 완료 | 3개 워크플로우 |
| `ANTHROPIC_API_KEY` | ✅ 완료 | GitHub Secrets |
| MCP 서버 설정 | ✅ 완료 | .mcp.json |
| 커스텀 명령어 | ✅ 완료 | .claude/commands/ |
| Git 워크플로우 | ✅ 완료 | CLAUDE.md에 문서화 |
| PR/Issue 템플릿 | ✅ 완료 | .github/ |
| Jira 연동 | ⏸️ 선택 | 환경변수 설정 필요 |

---

## 선택 설정: Jira 연동

Jira를 사용하는 경우:

1. **API 토큰 발급**: https://id.atlassian.com/manage-profile/security/api-tokens

2. **환경변수 설정**:
```bash
export JIRA_URL="https://your-domain.atlassian.net"
export JIRA_USERNAME="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
```

---

## 선택 설정: Branch Protection

Repository → Settings → Branches → Add rule

- Branch name pattern: `main`
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging

---

## 트러블슈팅

### 워크플로우가 실행되지 않음
- GitHub Actions 탭에서 워크플로우 활성화 확인
- Secrets 설정 확인 (`ANTHROPIC_API_KEY`)

### @claude 멘션이 작동하지 않음
- 봇 계정이 아닌지 확인
- 워크플로우 `if` 조건 확인

### MCP 서버 연결 실패
- 환경변수 설정 확인
- 의존성 설치: `pip install uv`, `npm install -g npx`

---

## 참고 자료

- [Claude Code GitHub Actions](https://github.com/anthropics/claude-code-action)
- [MCP Atlassian](https://github.com/sooperset/mcp-atlassian)
- [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
