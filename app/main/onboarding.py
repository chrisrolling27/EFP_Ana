import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass
from flask import Flask, render_template, url_for, redirect

'''
MoR onboarding Flow
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
    account_holder(LEMid, legalName, currency)
    return redirect(url_for('onboard_success', LEMid=LEMid))
  else:
    return response.text

def account_holder(LEMid, legalName, currency):
  url = "https://balanceplatform-api-test.adyen.com/bcl/v2/accountHolders"

  user = get_bp_user()
  password = get_bp_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
    "description": f'{legalName} Company Account Holder',
    "legalEntityId": LEMid
  }

  print("/accountHolders request:\n" + str(payload))

  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/accountHolders response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  AHid = node['id']
  print(AHid)
  print(response.headers)
  if response.status_code == 200:
    balance_account(AHid, currency, legalName, LEMid)
    return response.text
  else:
    return response.text


def balance_account(AHid, currency, legalName, LEMid):
  url = "https://balanceplatform-api-test.adyen.com/bcl/v2/balanceAccounts"

  user = get_bp_user()
  password = get_bp_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
    "description": f"{legalName} Balance Account",
    "accountHolderId": AHid,
    "defaultCurrencyCode": currency
  }

  print("/balanceAccounts request:\n" + str(payload))

  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/balanceAccounts response:\n" + response.text, response.status_code, response.reason)
  
  LEMid = LEMid
  node = json.loads(response.text)
  AHid = node['id']
  print(AHid)
  print(response.headers)
  if response.status_code == 200:
    print(LEMid)
    return response.text
  else:
    return response.text

#adyen_payment_links()
