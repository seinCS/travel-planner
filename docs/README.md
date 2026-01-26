# Travel Planner Documentation

> **최종 업데이트**: 2026-01-25

프로젝트 문서 디렉토리입니다. 체계적인 구조로 정리되어 있습니다.

---

## Directory Structure

```
docs/
├── README.md                    # 이 파일
├── PROJECT_STATUS_REPORT.md     # 프로젝트 진행 현황
├── COLLABORATION.md             # Claude Code 협업 환경
├── NEW_FEATURES_BLUEPRINT.md    # 신규 기능 청사진
├── OPTIMIZATION_ROADMAP.md      # 성능 최적화 로드맵
│
├── architecture/                # 아키텍처 문서
│   ├── ARCHITECTURE_ANALYSIS.md     # 아키텍처 분석 보고서
│   └── CLEAN_ARCHITECTURE_DESIGN.md # Clean Architecture 설계
│
├── features/                    # 기능별 문서
│   ├── itinerary/                   # 일정 기능
│   │   ├── ITINERARY_REQUIREMENTS.md
│   │   ├── ITINERARY_ARCHITECTURE_DESIGN.md
│   │   └── ITINERARY_PROGRESS_REPORT.md
│   ├── chatbot/                     # 챗봇 기능
│   │   └── CHATBOT_REQUIREMENTS.md
│   └── map/                         # 지도 기능
│       ├── MAP_CENTER_UNIFICATION_REQUIREMENTS.md
│       ├── MAP_CENTER_UNIFICATION_DESIGN.md
│       └── MAP_CENTER_UNIFICATION_WORKFLOW.md
│
├── testing/                     # 테스트 문서
│   ├── e2e-test-spec.md             # E2E 테스트 명세
│   └── e2e-test-elements.md         # E2E 테스트 요소
│
└── archive/                     # 보관 문서
    ├── completed/                   # 완료된 기능 문서
    │   ├── REFACTORING_ROADMAP.md
    │   ├── REALTIME_COLLABORATION_COMPLETION.md
    │   ├── MOBILE_UI_REQUIREMENTS.md
    │   ├── RESPONSIVE_UI_DESIGN.md
    │   ├── SHARE_PAGE_MOBILE_UI_REQUIREMENTS.md
    │   └── workflow_share_page_mobile_ui.md
    └── debate-logs/                 # PRD 토론 로그
        ├── debate-2026-01-25-chatbot.md
        └── debate-2026-01-25-chatbot-v2.md
```

---

## Document Categories

### Root Level (Active)
프로젝트 전체에 걸친 활성 문서입니다.

| 문서 | 설명 | 상태 |
|------|------|------|
| `PROJECT_STATUS_REPORT.md` | 전체 프로젝트 진행 현황 | 활성 |
| `COLLABORATION.md` | Claude Code & GitHub Actions 협업 환경 | 활성 |
| `NEW_FEATURES_BLUEPRINT.md` | 6가지 신규 기능 청사진 | 활성 |
| `OPTIMIZATION_ROADMAP.md` | React 리렌더링, 번들, API 최적화 | 활성 |

### Architecture (`architecture/`)
시스템 아키텍처 관련 문서입니다.

| 문서 | 설명 |
|------|------|
| `ARCHITECTURE_ANALYSIS.md` | 코드베이스 분석, 문제점 식별 |
| `CLEAN_ARCHITECTURE_DESIGN.md` | 리팩토링 후 Clean Architecture 설계 |

### Features (`features/`)
기능별 요구사항, 설계, 진행 현황 문서입니다.

#### Itinerary (일정 기능) - ✅ 완료
| 문서 | 설명 |
|------|------|
| `ITINERARY_REQUIREMENTS.md` | 일정 기능 요구사항 명세 |
| `ITINERARY_ARCHITECTURE_DESIGN.md` | 일정 기능 아키텍처 설계 |
| `ITINERARY_PROGRESS_REPORT.md` | Phase 1-7 진행 현황 |

#### Chatbot (챗봇 기능) - 🚧 설계 중
| 문서 | 설명 |
|------|------|
| `CHATBOT_REQUIREMENTS.md` | 챗봇 기능 요구사항 (PRD v1.2) |

#### Map (지도 기능) - ✅ 완료
| 문서 | 설명 |
|------|------|
| `MAP_CENTER_UNIFICATION_REQUIREMENTS.md` | 지도 중심점/배율 통일 요구사항 |
| `MAP_CENTER_UNIFICATION_DESIGN.md` | 컴포넌트 설계 |
| `MAP_CENTER_UNIFICATION_WORKFLOW.md` | 구현 워크플로우 |

### Testing (`testing/`)
E2E 테스트 관련 문서입니다.

| 문서 | 설명 |
|------|------|
| `e2e-test-spec.md` | Playwright E2E 테스트 시나리오 |
| `e2e-test-elements.md` | 페이지별 테스트 요소 셀렉터 |

### Archive (`archive/`)
완료되었거나 더 이상 활성화되지 않은 문서입니다.

#### Completed (`archive/completed/`)
- `REFACTORING_ROADMAP.md` - 리팩토링 로드맵 (완료)
- `REALTIME_COLLABORATION_COMPLETION.md` - 실시간 협업 완성 계획 (완료)
- `MOBILE_UI_REQUIREMENTS.md` - 모바일 UI 요구사항 (완료)
- `RESPONSIVE_UI_DESIGN.md` - 반응형 UI 설계 (완료)
- `SHARE_PAGE_MOBILE_UI_REQUIREMENTS.md` - 공유 페이지 모바일 (완료)
- `workflow_share_page_mobile_ui.md` - 공유 페이지 워크플로우 (완료)

#### Debate Logs (`archive/debate-logs/`)
PRD 토론 로그 (참조용)

---

## Naming Conventions

### File Naming
- **요구사항**: `{FEATURE}_REQUIREMENTS.md`
- **설계**: `{FEATURE}_DESIGN.md` 또는 `{FEATURE}_ARCHITECTURE_DESIGN.md`
- **워크플로우**: `{FEATURE}_WORKFLOW.md`
- **진행 현황**: `{FEATURE}_PROGRESS_REPORT.md`

### Directory Naming
- **기능별**: `features/{feature-name}/`
- **완료 문서**: `archive/completed/`
- **토론 로그**: `archive/debate-logs/`

---

## How to Add New Documentation

1. **새 기능 문서**: `features/{feature-name}/` 디렉토리 생성
2. **아키텍처 문서**: `architecture/` 디렉토리에 추가
3. **테스트 문서**: `testing/` 디렉토리에 추가
4. **완료된 문서**: `archive/completed/`로 이동
5. **이 README 업데이트**: 새 문서 추가 시 목록 갱신

---

## Quick Links

- [프로젝트 현황](./PROJECT_STATUS_REPORT.md)
- [아키텍처 분석](./architecture/ARCHITECTURE_ANALYSIS.md)
- [일정 기능](./features/itinerary/)
- [E2E 테스트](./testing/e2e-test-spec.md)
