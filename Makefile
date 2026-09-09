NVM_SH := $(HOME)/.nvm/nvm.sh
NVM := . $(NVM_SH) &&
NODE_VERSION := $(shell node -p "require('./package.json').engines.node.replace('>=', '')")

install:
	@$(NVM) nvm install $(NODE_VERSION)
	@cp .github/hooks/* .git/hooks/
	@chmod +x .git/hooks/*
	@echo "Hooks installed."
	@npm install

lint:
	@$(NVM) nvm use $(NODE_VERSION) && npm run lint

# Fully ephemeral end-to-end run: brings up the throwaway crm-api-test + MySQL
# containers (see test-env-up below), runs the existing test suite against
# them, then always tears both back down again — pass or fail. Nothing
# persists between runs, so there's no stale container/db state to reset.
test:
	@$(MAKE) test-env-up
	@status=0; ($(NVM) nvm use $(NODE_VERSION) && npm run test) || status=$$?; \
	$(MAKE) test-env-down; \
	open coverage/test-report.html; \
	exit $$status

AWS_REGION := us-east-2
ECR_HOST := 368539636127.dkr.ecr.us-east-2.amazonaws.com
MYSQL_IMAGE := $(ECR_HOST)/insignia/mysql:8.4.9
# crm-api has no published crm-api-test ECR image yet (unlike api-sdk-js's
# insignia/api-test) — build it locally from the sibling ../crm-api repo's
# Dockerfile.test instead. Swap this for a pulled image if/when crm-api adds
# a CI step that publishes one.
CRM_API_TEST_IMAGE := crm-api-test:local
CRM_API_DIR := ../crm-api

TEST_NETWORK := crm-api-sdk-test-net
TEST_DB_CONTAINER := crm-api-sdk-test-db
TEST_API_CONTAINER := crm-api-sdk-test-api
TEST_DB_PASSWORD := ephemeral12345
TEST_DB_DATABASE := zubi
# Matches .env.test's CRM_API_BASE_URL — don't change one without the other.
# 8003, not 8002, so this never collides with a locally-running `make run`
# dev server in crm-api.
TEST_API_PORT := 8003

.PHONY: test-env-up test-env-down ecr-login

ecr-login:
	@aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_HOST)

# Boots a throwaway MySQL + crm-api-test container pair on their own docker
# network. Neither container gets a volume, so `docker rm` (test-env-down)
# leaves nothing behind — every run starts from a schema-only db, migrated
# fresh. crm-api has no base-migration user seed (unlike api's TEST_EMAIL),
# so tests/helpers.js registers its own throwaway user per test run instead.
test-env-up: ecr-login
	@$(MAKE) test-env-down
	@echo "Freeing host port $(TEST_API_PORT) if something local is already on it..."
	@PIDS="$$(lsof -ti :$(TEST_API_PORT) -sTCP:LISTEN)"; [ -n "$$PIDS" ] && kill -9 $$PIDS || true
	@docker network create $(TEST_NETWORK) >/dev/null 2>&1 || true
	@docker pull --platform linux/amd64 $(MYSQL_IMAGE)
	@echo "Building crm-api test image from $(CRM_API_DIR)..."
	@docker build --platform linux/amd64 -f $(CRM_API_DIR)/Dockerfile.test -t $(CRM_API_TEST_IMAGE) $(CRM_API_DIR)
	@echo "Starting ephemeral MySQL..."
	@docker run -d --platform linux/amd64 --name $(TEST_DB_CONTAINER) --network $(TEST_NETWORK) \
		-e MYSQL_ROOT_PASSWORD=$(TEST_DB_PASSWORD) \
		-e MYSQL_DATABASE=$(TEST_DB_DATABASE) \
		--health-cmd="mysqladmin ping -h 127.0.0.1 -u root --password=$(TEST_DB_PASSWORD)" \
		--health-start-period=30s --health-interval=2s --health-retries=30 --health-timeout=10s \
		$(MYSQL_IMAGE) >/dev/null
	@echo "Waiting for MySQL to be healthy..."
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' $(TEST_DB_CONTAINER) 2>/dev/null)" = "healthy" ]; do sleep 1; done
	@echo "Starting crm-api-test container on port $(TEST_API_PORT)..."
	@docker run -d --platform linux/amd64 --name $(TEST_API_CONTAINER) --network $(TEST_NETWORK) -p $(TEST_API_PORT):8000 \
		-e APP_NAME=crm-api-test \
		-e APP_ENV=testing \
		-e APP_KEY="base64:$$(openssl rand -base64 32)" \
		-e APP_DEBUG=true \
		-e APP_URL=http://localhost:$(TEST_API_PORT) \
		-e APP_TIMEZONE=America/Caracas \
		-e APP_LOCALE=es \
		-e APP_FALLBACK_LOCALE=en \
		-e LOG_CHANNEL=stderr \
		-e DB_CONNECTION=mysql \
		-e DB_HOST=$(TEST_DB_CONTAINER) \
		-e DB_PORT=3306 \
		-e DB_DATABASE=$(TEST_DB_DATABASE) \
		-e DB_USERNAME=root \
		-e DB_PASSWORD=$(TEST_DB_PASSWORD) \
		-e SESSION_DRIVER=cookie \
		-e SESSION_LIFETIME=43200 \
		-e SESSION_SECURE_COOKIE=false \
		-e SESSION_HTTP_ONLY=true \
		-e CACHE_DRIVER=file \
		-e QUEUE_CONNECTION=sync \
		-e BROADCAST_DRIVER=log \
		-e MAIL_MAILER=log \
		-e JWT_SECRET="$$(openssl rand -hex 32)" \
		$(CRM_API_TEST_IMAGE) >/dev/null
	@echo "Waiting for API to respond..."
	@for i in $$(seq 1 60); do \
		curl -sSf -o /dev/null http://localhost:$(TEST_API_PORT)/ 2>/dev/null && break; \
		sleep 1; \
	done
	@echo "Running migrations..."
	@docker exec -w /platform $(TEST_API_CONTAINER) php artisan migrate --force
	@echo "Test environment ready at http://localhost:$(TEST_API_PORT)"

test-env-down:
	@docker rm -f $(TEST_API_CONTAINER) $(TEST_DB_CONTAINER) >/dev/null 2>&1 || true
	@docker network rm $(TEST_NETWORK) >/dev/null 2>&1 || true

login:
	@$(NVM) nvm use $(NODE_VERSION) && npm login

precommit:
	@$(NVM) nvm use $(NODE_VERSION) && npm run lint && npm run test

publish:
	@$(NVM) nvm use $(NODE_VERSION) && (npm whoami 2>/dev/null || npm login) && npm publish --access public

release:
	@make install
	@bash scripts/release.sh

update-sdk:
	@bash scripts/update-sdk.sh
