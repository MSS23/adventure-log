# Adventure Log - Makefile for Docker Operations
# Provides convenient commands for development and deployment

# Default values
DOCKER_IMAGE_NAME := adventure-log
DOCKER_TAG := latest
DOCKER_REGISTRY :=
DOCKER_PLATFORM := linux/amd64,linux/arm64

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

.PHONY: help build dev prod clean logs test deploy

# Default target
help: ## Show this help message
	@echo "$(BLUE)Adventure Log - Docker Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Development Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '^(dev|logs|clean)' | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Production Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '^(build|prod|deploy|push)' | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Utility Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v -E '^(dev|logs|clean|build|prod|deploy|push)' | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Development Commands
dev: ## Start development environment with hot reloading
	@echo "$(BLUE)Starting Adventure Log development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up --build

dev-bg: ## Start development environment in background
	@echo "$(BLUE)Starting Adventure Log development environment in background...$(NC)"
	docker-compose -f docker-compose.dev.yml up --build -d

dev-down: ## Stop development environment
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## Show development environment logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-shell: ## Access development container shell
	docker-compose -f docker-compose.dev.yml exec adventure-log-dev sh

# Production Commands
build: ## Build production Docker image
	@echo "$(BLUE)Building Adventure Log production image...$(NC)"
	docker build \
		--target runner \
		--platform $(DOCKER_PLATFORM) \
		--tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) \
		--tag $(DOCKER_IMAGE_NAME):latest \
		.

build-multi: ## Build multi-platform production image
	@echo "$(BLUE)Building multi-platform Adventure Log image...$(NC)"
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--target runner \
		--tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) \
		--tag $(DOCKER_IMAGE_NAME):latest \
		--push \
		.

prod: ## Start production environment
	@echo "$(BLUE)Starting Adventure Log production environment...$(NC)"
	docker-compose up --build

prod-bg: ## Start production environment in background
	@echo "$(BLUE)Starting Adventure Log production environment in background...$(NC)"
	docker-compose up --build -d

prod-down: ## Stop production environment
	@echo "$(YELLOW)Stopping production environment...$(NC)"
	docker-compose down

prod-logs: ## Show production environment logs
	docker-compose logs -f

# Deployment Commands
push: ## Push image to registry
	@echo "$(BLUE)Pushing Adventure Log image to registry...$(NC)"
	@if [ -z "$(DOCKER_REGISTRY)" ]; then \
		echo "$(RED)Error: DOCKER_REGISTRY not set$(NC)"; \
		exit 1; \
	fi
	docker tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

deploy: ## Deploy to production (requires Docker Swarm or K8s)
	@echo "$(BLUE)Deploying Adventure Log to production...$(NC)"
	docker stack deploy -c docker-compose.yml adventure-log

deploy-traefik: ## Deploy with Traefik reverse proxy
	@echo "$(BLUE)Deploying Adventure Log with Traefik...$(NC)"
	docker-compose --profile production-traefik up -d

# Testing Commands
test: ## Run tests in container
	@echo "$(BLUE)Running Adventure Log tests...$(NC)"
	docker-compose -f docker-compose.dev.yml exec adventure-log-dev npm test

test-build: ## Test production build
	@echo "$(BLUE)Testing production build...$(NC)"
	docker build --target builder .

# Utility Commands
logs: ## Show logs from all services
	docker-compose logs -f

clean: ## Clean up Docker resources
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	docker-compose down --volumes --remove-orphans
	docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans
	docker system prune -f
	docker volume prune -f

clean-all: ## Clean up all Docker resources (including images)
	@echo "$(RED)Cleaning up ALL Docker resources...$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$ ]]; then \
		docker-compose down --volumes --remove-orphans; \
		docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans; \
		docker system prune -af; \
		docker volume prune -f; \
		docker image prune -af; \
	fi

shell: ## Access production container shell
	docker-compose exec adventure-log sh

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	docker-compose ps
	@echo ""
	@echo "$(BLUE)Container health checks:$(NC)"
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

backup: ## Backup volumes
	@echo "$(BLUE)Creating backup of volumes...$(NC)"
	docker run --rm -v adventure-log-redis-data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/redis-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .

restore: ## Restore volumes from backup (usage: make restore BACKUP_FILE=backup.tar.gz)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: BACKUP_FILE not specified$(NC)"; \
		echo "Usage: make restore BACKUP_FILE=backup.tar.gz"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring from backup: $(BACKUP_FILE)$(NC)"
	docker run --rm -v adventure-log-redis-data:/data -v $(PWD)/backups:/backup alpine tar xzf /backup/$(BACKUP_FILE) -C /data

monitor: ## Start monitoring stack
	@echo "$(BLUE)Starting monitoring stack...$(NC)"
	docker-compose --profile monitoring up -d

# Quick commands
up: dev ## Alias for dev
down: dev-down ## Alias for dev-down
restart: dev-down dev ## Restart development environment

# Version information
version: ## Show version information
	@echo "$(BLUE)Adventure Log Docker Setup$(NC)"
	@echo "Docker version: $(shell docker --version)"
	@echo "Docker Compose version: $(shell docker-compose --version)"
	@echo "Image: $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)"