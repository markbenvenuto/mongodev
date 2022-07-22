#!/bin/sh

if [ -f venv/bin/activate ]; then
    echo "run_virtualenv.sh: Activating Virtual Env from venv/bin/activate"
    . venv/bin/activate
elif [ -f python3-venv/bin/activate ]; then
    echo "run_virtualenv.sh: Activating Virtual Env from python3-venv/bin/activate"
    . python3-venv/bin/activate
else
    SYSTEM_PYTHON=$(which python3)
    echo "run_virtualenv.sh: No python virual env found, using system python '$SYSTEM_PYTHON'"
fi

exec $*