.PHONY: dev test test-watch lint build typecheck ci

dev:
	pnpm dev

test:
	pnpm test

test-watch:
	pnpm test:watch

lint:
	pnpm lint

typecheck:
	pnpm tsc --noEmit

build:
	pnpm build

ci: lint typecheck test
