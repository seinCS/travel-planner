# Jira 티켓 작업 시작

이 명령어는 Jira 티켓을 기반으로 새로운 작업을 시작합니다.

## 입력
$ARGUMENTS (Jira 티켓 ID, 예: TRAVEL-123)

## 실행 단계

### 1. Jira 티켓 정보 조회
MCP Atlassian 서버를 통해 티켓 정보를 가져옵니다:
- 티켓 제목 (Summary)
- 설명 (Description)
- 담당자 (Assignee)
- 우선순위 (Priority)
- 현재 상태 (Status)
- 첨부된 스펙/디자인 문서

### 2. 작업 계획 수립
티켓 내용을 분석하여:
- 구현해야 할 기능 목록 정리
- 수정/추가가 필요한 파일 파악
- 예상되는 작업 단계 분류
- 의존성 확인

### 3. Git 브랜치 생성
```
feature/{ticket-id}-{summary-slug}
```
예: `feature/TRAVEL-123-add-user-profile`

### 4. Jira 상태 업데이트
티켓 상태를 "In Progress"로 변경

### 5. 작업 시작 코멘트
Jira 티켓에 작업 시작 코멘트 추가:
```
🚀 작업을 시작합니다.

**브랜치**: feature/TRAVEL-123-add-user-profile
**예상 작업 범위**:
- [파일 목록]

**작업 계획**:
1. [단계 1]
2. [단계 2]
...
```

## 출력
- 티켓 요약 정보
- 작업 계획
- 생성된 브랜치 정보
- 다음 단계 안내

## 사용 예시
```
/project:jira-start TRAVEL-123
```
