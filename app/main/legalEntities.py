import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass
from flask import Flask, render_template, url_for, redirect

'''
Generate PayByLink
'''

def legal_entity(legalName, currency, country):
    url = "https://kyc-test.adyen.com/lem/v2/legalEntities"

    user = get_lem_user()
    password = get_lem_pass()

    basic = (user, password)
    platform = "test" # change to live for production

    headers = {
        'Content-Type': 'application/json'
    }

    payload = {
    "type": "organization",
      "organization": {
    "legalName": legalName,
    "type": "privateCompany",
    "registeredAddress": {
      "country": country
    }
  }
}

    print("/legalEntities request:\n" + str(payload))

    response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

    print("/legalEntities response:\n" + response.text, response.status_code, response.reason)
    
    node = json.loads(response.text)
    LEMid = node['id']
    print(LEMid)
    print(response.headers)
    if response.status_code == 200:
      return redirect(url_for('checkout_success'))
    else:
      return response.text

#adyen_payment_links()
