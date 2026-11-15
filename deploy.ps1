$ErrorActionPreference = "Stop"

# Public, browser-side values baked into the frontend image. Set them first:
#   $env:VITE_SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "YOUR-PUBLISHABLE-KEY"
if (-not $env:VITE_SUPABASE_URL -or -not $env:VITE_SUPABASE_ANON_KEY) {
    throw "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running deploy.ps1"
}

# Real secrets are git-ignored. Copy each file in k8s/secret-templates/ to k8s/ and fill it in.
$secrets = "database", "resend", "supabase" | ForEach-Object { "k8s/$_-credentials-secret.yaml" }
$missing = $secrets | Where-Object { -not (Test-Path $_) }
if ($missing) {
    throw "Missing secret file(s): $($missing -join ', '). Create them from k8s/secret-templates/."
}

Write-Host "Building images..."
docker build -t kwikq-backend:latest ./Backend
docker build `
  --build-arg VITE_SUPABASE_URL=$env:VITE_SUPABASE_URL `
  --build-arg VITE_SUPABASE_ANON_KEY=$env:VITE_SUPABASE_ANON_KEY `
  -t kwikq-frontend:latest ./Frontend

# kind and minikube don't share Docker's image store; load the images into the cluster.
$context = (kubectl config current-context 2>$null)
if ($context -match "^kind-(.+)$") {
    kind load docker-image kwikq-backend:latest kwikq-frontend:latest --name $Matches[1]
} elseif ($context -match "^minikube") {
    minikube image load kwikq-backend:latest
    minikube image load kwikq-frontend:latest
}

Write-Host "Applying Kubernetes configuration..."
kubectl apply -f k8s/
# Same :latest tag on every build, so restart to pick up the new images.
kubectl rollout restart deployment/kwikq-backend deployment/kwikq-frontend
kubectl rollout status deployment/kwikq-backend
kubectl rollout status deployment/kwikq-frontend

# nginx in the frontend pod proxies /api to the backend, so one port-forward is enough.
Write-Host "Starting port-forward on http://localhost:8080 ..."
$forward = Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/kwikq-frontend-svc", "8080:80" -NoNewWindow -PassThru

$nodePort = kubectl get svc kwikq-frontend-svc -o jsonpath="{.spec.ports[0].nodePort}" 2>$null

Write-Host ""
Write-Host "Deployment complete."
Write-Host "  App (port-forward): http://localhost:8080"
if ($nodePort) {
    Write-Host "  App (NodePort):     http://localhost:$nodePort  (Docker Desktop; kind needs extraPortMappings, minikube needs 'minikube service kwikq-frontend-svc')"
}
Write-Host "  Stop the port-forward with: Stop-Process -Id $($forward.Id)"
