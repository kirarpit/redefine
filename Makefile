IMAGE_NAME=ghcr.io/kirarpit/redefine
TAG=latest
FULL_IMAGE=$(IMAGE_NAME):$(TAG)
PLATFORMS=linux/amd64,linux/arm64

# Make sure GHCR_PAT is exported in your shell or sourced from .env
push:
	@echo "🔧 Building multi-arch image for $(PLATFORMS)..."
	@docker buildx create --use --name multiarch-builder || true
	@docker buildx inspect multiarch-builder --bootstrap
	@echo "🔐 Logging in to ghcr.io..."
	@echo $$GHCR_PAT | docker login ghcr.io -u kirarpit --password-stdin
	@echo "📦 Building and pushing image: $(FULL_IMAGE)"
	@docker buildx build --platform $(PLATFORMS) -t $(FULL_IMAGE) --push .
	@echo "✅ Done!"
