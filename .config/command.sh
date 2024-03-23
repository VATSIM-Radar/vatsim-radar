#!/bin/sh

if ! [ -d "/frontend/.config/certs" ]; then
    mkdir /frontend/.config/certs
    echo "[ req ]\n\
    prompt = no\n\
    distinguished_name = req_distinguished_name\n\n\
    [ req_distinguished_name ]\n\
    C = EN\n\
    ST = City\n\
    L = City\n\
    O = Vatsim Radar\n\
    OU = Radar\n\
    CN = radar\n\
    emailAddress = radar@foo.bar" > /frontend/.config/certs/openssl.cnf
    openssl genrsa -out /frontend/.config/certs/server.key 4096
    openssl req -config /frontend/.config/certs/openssl.cnf -new -key /frontend/.config/certs/server.key -out /frontend/.config/certs/server.csr
    openssl x509 -req -days 4096 -in /frontend/.config/certs/server.csr -signkey /frontend/.config/certs/server.key -out /frontend/.config/certs/server.crt
fi

yarn
cd /frontend
rm -rf /tmp/nitro/worker-*
exec yarn dev --qr=false
