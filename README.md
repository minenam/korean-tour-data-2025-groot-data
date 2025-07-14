# visitor-2025

한국관광공사 OpenAPI 데이터 수집 서버 (TypeScript, Express)

## 주요 기능

- 한국관광공사 OpenAPI에서 관광 데이터를 수집하여 JSON으로 반환
- 환경변수(.env)로 API 키 등 민감 정보 관리
- pnpm 기반 패키지 관리

## 폴더 구조

```
visitor-2025/
├── src/
│   ├── index.ts      # 서버 엔트리포인트
│   └── api.ts        # 관광공사 API 호출 함수
├── .env              # 환경변수 파일 (직접 생성 필요)
├── package.json
├── tsconfig.json
└── README.md
```

## 환경 변수 (.env 예시)

```
TOUR_API_KEY=여기에_발급받은_키_입력
PORT=3000
```

## 설치 및 실행

### 1. 의존성 설치

```
pnpm install
```

### 2. 개발 서버 실행 (자동 리로드 X)

```
pnpm run dev
```

### 3. 빌드

```
pnpm run build
```

### 4. 빌드된 서버 실행

```
pnpm start
```

## API 예시

- `GET /tour` : 관광공사 OpenAPI에서 받아온 데이터(JSON)

## 보안 주의

- `.env` 파일은 절대 깃에 올리지 마세요. (gitignore에 기본 포함)
- API 키는 코드에 직접 노출하지 마세요.
