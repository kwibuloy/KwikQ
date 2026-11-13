$ErrorActionPreference = "Stop"

# Set these first (they are public, browser-side values):
#   $env:VITE_SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "YOUR-ANON-KEY"
if (-not $env:VITE_SUPABASE_URL -or -not $env:VITE_SUPABASE_ANON_KEY) {
    throw "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running deploy.ps1"
}


Write-Host "Building Backend..."
docker build -t kwikq-backend:latest ./Backend

Write-Host "Building Frontend..."
docker build `
  --build-arg VITE_SUPABASE_URL=$env:VITE_SUPABASE_URL `
  --build-arg VITE_SUPABASE_ANON_KEY=$env:VITE_SUPABASE_ANON_KEY `
  -t kwikq-frontend:latest ./Frontend

Write-Host "Applying Kubernetes configurations..."
# Secrets are git-ignored; create them from k8s/*.example.yaml first.
kubectl apply -f k8s/

Write-Host "Waiting for deployments to be ready..."
kubectl rollout status deployment/kwikq-backend
kubectl rollout status deployment/kwikq-frontend

Write-Host "Setting up port forwarding (reliable on Windows)..."


Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/kwikq-backend-svc", "5000:80" -NoNewWindow
Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/kwikq-frontend-svc", "8080:80" -NoNewWindow

$context = (kubectl config current-context 2>$null)
$frontendPort = kubectl get svc kwikq-frontend-svc -o jsonpath="{.spec.ports[0].port}" 2>$null
$endpoints = kubectl get endpoints kwikq-frontend-svc -o jsonpath="{.subsets[0].addresses}" 2>$null

Write-Host ""
Write-Host "Deployment complete!"
Write-Host "Frontend (port-forward): http://localhost:8080"
Write-Host "Backend (port-forward):  http://localhost:5000"

if ($frontendPort) {
    Write-Host "Frontend (LoadBalancer): http://localhost:$frontendPort"
    if ($context -match "^minikube") {
        Write-Host "Minikube: run 'minikube tunnel' in another terminal, or use port-forward :8080 above."
    }
    if ($context -match "^kind-") {
        Write-Host "kind: use port-forward :8080 or k8s/kind-config.yaml with extraPortMappings."
    }
    if (-not $endpoints) {
        Write-Host "Warning: frontend service has no ready endpoints yet. NodePort will fail until pods are Ready." -ForegroundColor Yellow
    }
}

