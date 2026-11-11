# 다음에 이어서 할 일

> 2026-11-11 Windows 노트북에서 작성. 1단계(뼈대)까지 했다.
> **실기기·시뮬레이터에서는 한 번도 띄워 보지 않았다.** lint, 타입 체크, iOS JS 번들 빌드까지만 확인했다.
> 할 일이 끝나면 이 파일을 지우거나 다음 할 일로 바꾼다.

기준 문서는 [docs/plan.md](docs/plan.md) 다. 원문: https://claude.ai/artifact/QqVnspr8CWRmWhH9pax83F

## 지금 있는 것

- Expo SDK 54 + TypeScript + expo-router 6. 버전은 책력(`../chaekryeok`)과 맞췄다
- 하단 탭 5개: 달력(`index`), 냉장고(`fridge`), 이번 주(`this-week`), 레시피(`recipes`), 장보기(`shopping`)
- 달력 탭에는 책력의 달력 틀을 옮겼다 — 월 이동, 월요일 시작, 좌우 스와이프, "오늘" 버튼, 오늘 칸 강조
- 나머지 탭 4개는 빈 화면이다
- DB — `db/` 에 스키마 v1(테이블 5개), 마이그레이션, 테이블별 repository 함수, 단위 테스트 18개.
  앱을 켤 때 `app/_layout.tsx` 가 `getDB()` 를 불러 DB 를 만들지만, 화면은 아직 DB 를 읽지 않는다
- [docs/plan.md](docs/plan.md) 기획서, [docs/appstore-metadata.md](docs/appstore-metadata.md) 스토어 문구 초안

## 아직 없는 것

- 화면에서 DB 를 쓰는 코드. `store/` 폴더도 아직 없다
- 앱 아이콘, 스플래시, iOS 번들 ID, `eas.json`
- `docs/privacy.md`, `docs/support.md`

## 이번에 정한 것

- **iOS 만 만든다.** `app.json` 의 `android` 블록과 `android` 스크립트를 지웠다
- **폴더 구조는 책력과 같다** — 루트에 `app/`, `components/`, `constants/`, `hooks/`, 경로 별칭 `@/*`
- **lint 는 책력에 없던 것을 새로 넣었다** — `expo lint` (eslint 9 + eslint-config-expo)
- **달력 틀은 책력 것을 그대로 쓴다.** `MonthNavigator` 는 같은 파일이고, `CalendarGrid` 는 `onPressDay` 만 뺐다.
  `CalendarCell` 과 `useCalendar` 는 책 데이터(표지, 읽는 기간 막대)를 걷어낸 판이다. 날짜 칸은 아직 눌리지 않는다
- **색은 책력의 초록(`#639922`)을 임시로 쓴다.** 도시락력 포인트 색은 정하지 않았다
- `babel-preset-expo` 는 책력의 `^55` 가 아니라 `~54.0.10` 이다. expo-doctor 가 SDK 54 와 어긋난다고 해서 내렸다
- **DB 는 가계력처럼 `PRAGMA user_version` 으로 버전을 관리한다.** 스키마를 바꿀 때는 `db/migrations.ts` 의
  `MIGRATIONS` 배열 **뒤에 추가**만 한다. 이미 있는 항목은 고치지 않는다
- **repository 함수는 첫 인자로 `db` 를 받는다** (책력은 함수 안에서 `getDB()` 를 부른다).
  테스트에서 expo-sqlite 대신 Node 내장 `node:sqlite` 를 끼우기 위해서다 — `db/testDb.ts`
- **재료의 남은 양은 넉넉/조금/없음 세 단계다.** plan.md "아직 정하지 않은 것" 의 재료 양 입력은 이것으로 정해졌다
- reanimated, zustand 는 쓰는 곳이 없어 넣지 않았다. 필요해지면 책력과 같은 버전으로 넣는다

## 1. 받기 + 확인

```bash
git clone https://github.com/janerim/dosirakryeok.git
cd dosirakryeok
npm install
npm run lint
npm run typecheck
npm test               # 18개 통과. Node 22.5 이상이 필요하다 (node:sqlite)
npx expo-doctor        # 18/18 이 나와야 한다
npm start              # iPhone 의 Expo Go 로 QR 을 찍는다
```

- [ ] 탭 5개를 오갈 수 있다. 선택된 탭은 채운 아이콘, 나머지는 선 아이콘이다
- [ ] 달력이 책력과 같은 모양이다 — 요일 줄, 토·일 색, 오늘 칸 배경
- [ ] 좌우 스와이프와 화살표로 달이 넘어가고, "오늘" 을 누르면 이번 달로 돌아온다
- [ ] 탭 아이콘이 깨지지 않는다 (`expo-font` 를 넣은 이유)
- [ ] 앱을 켤 때 콘솔에 DB 오류가 없다. **기기에서 DB 가 열리는지는 아직 확인하지 못했다**

## 2. 다음 단계 — plan.md 1주차

"DB 스키마, 달력 홈 이식, 재료 등록과 냉장고 화면" 중 DB 스키마와 달력 틀이 됐다.

- [ ] 재료 등록 — 이름, 보관 위치, 넣은 날짜. 자주 사는 재료는 탭 한 번
- [ ] 냉장고 화면 — 보관 위치별 재료와 보관 일수
- [ ] 달력 칸에 도시락 표시, 날짜 칸 누르기

## 남은 결정

plan.md "아직 정하지 않은 것" 중 남은 세 가지(레시피 출처, 착수 시점, 저녁·주말 식사)에 더해:

- [ ] 포인트 색
- [ ] iOS 번들 ID — 책력은 `com.ryubi.chaengnyeok` 이다
