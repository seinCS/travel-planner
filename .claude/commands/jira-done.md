# Jira 티켓 작업 완료

이 명령어는 Jira 티켓 작업을 완료하고 PR을 생성합니다.

## 입력
$ARGUMENTS (Jira 티켓 ID, 예: TRAVEL-123)

## 실행 단계

### 1. 변경 사항 확인
- `git status`로 변경된 파일 확인
- 변경 내용 요약 생성

### 2. 코드 품질 검사
```bash
npm run lint
npm run build
```
- 린트 에러 자동 수정 시도
- 빌드 에러가 있으면 보고

### 3. 커밋 생성
커밋 메시지 형식:
```
[TRAVEL-123] feat: 기능 설명

- 변경 사항 1
- 변경 사항 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 4. 브랜치 Push
```bash
git push -u origin feature/TRAVEL-123-xxx
```

### 5. PR 생성
GitHub MCP를 통해 PR 생성:

**PR 제목**: `[TRAVEL-123] 기능 설명`

**PR 본문**:
```markdown
## 개요
Jira 티켓: [TRAVEL-123](https://xxx.atlassian.net/browse/TRAVEL-123)

## 변경 사항
- 변경 사항 1
- 변경 사항 2

## 테스트 방법
1. 테스트 단계 1
2. 테스트 단계 2

## 스크린샷
(해당되는 경우)

## 체크리스트
- [ ] 코드 린트 통과
- [ ] 빌드 성공
- [ ] 테스트 통과
- [ ] 문서 업데이트 (필요시)
```

### 6. Jira 업데이트
- 티켓 상태를 "Code Review"로 변경
- PR 링크를 티켓에 코멘트로 추가:
```
✅ PR 생성 완료

**PR**: https://github.com/xxx/travel-planner/pull/123
**리뷰어**: @팀원

다음 단계: 코드 리뷰 후 머지
```

## 출력
- 커밋 요약
- PR 링크
- Jira 업데이트 확인
- 다음 단계 안내

## 사용 예시
```
/project:jira-done TRAVEL-123
```
