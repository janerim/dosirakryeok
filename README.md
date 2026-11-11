# 도시락력

주말에 한 번 준비해서 평일 도시락 5일을 해결하는, 1인 가구 직장인용 도시락 달력 앱이다.
Expo + TypeScript + expo-sqlite 로 만들고, 서버 없이 기기 안에만 저장한다. iOS 만 만든다.

기획은 [docs/plan.md](docs/plan.md), 이어서 할 일은 [NEXT.md](NEXT.md) 에 있다.

## 실행

```bash
npm install
npm start          # iPhone 의 Expo Go 로 QR 을 찍는다
```

```bash
npm test           # 단위 테스트 (Node 22.5 이상)
npm run typecheck
npm run lint
```

## 레시피 추가하기

앱에 들어 있는 레시피는 [assets/recipes.json](assets/recipes.json) 에 있다. 이 파일에 항목을 추가하고
앱을 다시 켜면 레시피 탭에 나타난다.

```json
{
  "name": "달걀볶음밥",
  "cook_minutes": 10,
  "ingredients": [
    { "name": "밥", "amount": "1공기" },
    { "name": "달걀", "amount": "2개" }
  ],
  "steps": [
    "대파를 잘게 썬다.",
    "달걀을 풀어 넣고 밥과 함께 볶는다."
  ],
  "storage_method": "한 김 식혀 밀폐 용기에 담아 냉장한다. 먹기 전에 전자레인지에 2분 데운다.",
  "storage_days": 3
}
```

| 필드 | 형식 | 뜻 |
|---|---|---|
| `name` | 문자열 | 레시피 이름. **파일 안에서 겹치면 안 된다** |
| `cook_minutes` | 숫자 | 조리 시간(분). 15 이하 |
| `ingredients` | 배열 | 재료 목록. 5개 이하 |
| `ingredients[].name` | 문자열 | 재료 이름. 냉장고 탭에 등록하는 이름과 같게 쓴다 |
| `ingredients[].amount` | 문자열 | 필요한 양. `"2개"`, `"1/2모"` 처럼 단위까지 적는다 |
| `steps` | 문자열 배열 | 조리 순서. 한 단계가 한 항목이고 번호는 앱이 붙인다 |
| `storage_method` | 문자열 | 보관 방법과 데우는 방법 |
| `storage_days` | 숫자 | 보관 가능 일수 |

모든 필드가 필수다. 싣는 기준은 보관했다가 데워 먹어도 괜찮은 도시락 메뉴, 재료 5개 이하, 조리 15분 이내다.
`npm test` 가 형식과 재료 수, 조리 시간을 검사한다.

앱은 켤 때마다 이 파일을 DB 에 맞춘다.

- **이름으로 같은 레시피인지 판단한다.** 이름이 같으면 내용을 덮어쓰고, 없는 이름이면 새로 넣는다
- 그래서 이름을 바꾸면 새 레시피가 하나 더 생기고, 옛 이름의 레시피는 남는다
- 파일에서 지운 레시피는 앱에서 지워지지 않는다. 이미 짠 식단이 가리키고 있을 수 있어서다
