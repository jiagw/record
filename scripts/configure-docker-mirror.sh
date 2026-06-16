#!/bin/sh
# 在阿里云等国内服务器上配置 Docker 镜像加速（需 root）
set -e

MIRROR="${1:-https://docker.m.daocloud.io}"

mkdir -p /etc/docker

if [ -f /etc/docker/daemon.json ]; then
  cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
fi

cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "${MIRROR}"
  ]
}
EOF

systemctl daemon-reload
systemctl restart docker

echo "Docker mirror configured: ${MIRROR}"
echo "Test: docker pull hello-world"
