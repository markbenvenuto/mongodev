#!/bin/bash

set -e

if [ ! -f SConstruct ]; then
    echo "Wrong Directory, must be in mongo repo"
    exit 1
fi

rm -rf .venv

echo Setting up venv at ".env"
/opt/mongodbtoolchain/v4/bin/python3 -m venv .venv

echo Activating Virtual Env ".env"
. .venv/bin/activate

echo Install poetry
python -m pip install 'poetry==1.5.1'

echo Install python modules via poetry
export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring
python -m poetry install --no-root --sync

echo Done reinstall venv at ".env"
