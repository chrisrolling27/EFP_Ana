import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass, get_adyen_api_key, get_adyen_merchant_account
from flask import Flask, render_template, url_for, redirect
from main import database

'''
Issue a new card
'''

def create_card(balance_account, brand, variant, card_holder, country, factor, lem_id):
  url = "https://balanceplatform-api-test.adyen.com/bcl/v3/paymentInstruments"

  user = get_bp_user()
  password = get_bp_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
    "type": "card",
    "balanceAccountId": balance_account,
    "issuingCountryCode": country,
    "card":
        {
        "cardholderName": card_holder,
        "brand": brand,
        "brandVariant": variant,
        "formFactor": factor
        }
    }

  print("/paymentInstruments request:\n" + str(payload))

  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/paymentInstruments response:\n" + response.text, response.status_code, response.reason)

  node = json.loads(response.text)
  card_id = node['id']
  data = response.text

  
  print(response.headers)
  if response.status_code == 422:
    node = json.loads(response.text)
    reason = node['invalidFields'][0]['message']
    print(reason)
    return reason
  if response.status_code == 200:
    database.insert_card(card_id, lem_id, data)
    card_data = database.get_cards(lem_id)
    print(card_data)
    return card_data
  else:
    return response.text



