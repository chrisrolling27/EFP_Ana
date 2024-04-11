#!/usr/bin/env bash
python3 -m venv venv --clear --upgrade-deps
. venv/bin/activate
pip3 install --extra-index-url https://nexus-pip-mirror.is.adyen.com/repository/data-external/simple -r requirements.txt
