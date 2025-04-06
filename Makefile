include .env
export

IMAGE_NAME=ghcr.io/kirarpit/redefine
TAG=latest
FULL_IMAGE=$(IMAGE_NAME):$(TAG)
PLATFORMS=linux/amd64,linux/arm64


print-env:
	@echo "GHCR_PAT: $(GHCR_PAT)"

push:
	@echo "🔧 Building multi-arch image for $(PLATFORMS)..."
	@docker buildx use multiarch-builder || docker buildx create --use --name multiarch-builder
	@docker buildx inspect multiarch-builder --bootstrap
	@echo "🔐 Logging in to ghcr.io..."
	@echo $$GHCR_PAT | docker login ghcr.io -u kirarpit --password-stdin
	@echo "📦 Building and pushing image: $(FULL_IMAGE)"
	@docker buildx build --provenance=false --no-cache --platform $(PLATFORMS) -t $(FULL_IMAGE) --push .
	@echo "✅ Done!"
