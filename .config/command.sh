#!/bin/sh

if ! [ -d "/radar/.config/certs" ]; then
    mkdir /radar/.config/certs
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
    emailAddress = radar@foo.bar" > /radar/.config/certs/openssl.cnf
    openssl genrsa -out /radar/.config/certs/server.key 4096
    openssl req -config /radar/.config/certs/openssl.cnf -new -key /radar/.config/certs/server.key -out /radar/.config/certs/server.csr
    openssl x509 -req -days 4096 -in /radar/.config/certs/server.csr -signkey /radar/.config/certs/server.key -out /radar/.config/certs/server.crt
fi

yarn
cd /radar
npx prisma generate
npx prisma migrate deploy
rm -rf /tmp/nitro/worker-*
exec yarn dev --qr=false
