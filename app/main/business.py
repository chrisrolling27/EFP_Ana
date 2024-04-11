import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass, get_adyen_api_key, get_adyen_merchant_account
from flask import Flask, render_template, url_for, redirect, session
from flask_session import Session
from main import database

'''
Partner Model onboarding Flow
'''

def business_line(industryCode,
                webAddress,
                lem_id,
                channel):
  url = "https://kyc-test.adyen.com/lem/v2/businessLines"

  user = get_lem_user()
  password = get_lem_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
    "capability": "receivePayments",
    "salesChannels": [channel],
    "industryCode": industryCode,
    "legalEntityId": lem_id,
    "webData": [
        {
        "webAddress": webAddress
        }
    ]
    }

  print("/businessLines request:\n" + str(payload))
  session['blReq'] = json.dumps(payload, indent=2)


  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/businessLines response:\n" + response.text, response.status_code, response.reason)
  
  print(response.headers)
  if response.status_code == 422:
    node = json.loads(response.text)
    reason = node['invalidFields'][0]['message']
    print(reason)
    return reason
  if response.status_code == 200:
    node = json.loads(response.text)
    session['blRes'] = json.dumps(node, indent=2)
    businessLine = node['id']
    dataToStore = {'industryCode': industryCode, 'salesChannel': channel}
    jsonData = json.dumps(dataToStore)
    storeDB = database.insert_business(businessLine, lem_id, jsonData)
    print(jsonData)
    # store_create(reference, description, shopperStatement, phoneNumber, line1, city, country, postalCode, businessLine, schemes, currencies, countries, lem_id)
    return redirect(url_for('onboard_success', LEMid=lem_id))
  else:
    return response.text




# def get_bl_for_le(storeId):
#   merchantId = get_adyen_merchant_account()
#   url = f"https://management-test.adyen.com/v1/merchants/{merchantId}/stores/{storeId}"

#   apiKey = get_adyen_api_key()
#   platform = "test" # change to live for production

#   headers = {
#       'Content-Type': 'application/json',
#       'x-api-key': apiKey
#   }

#   print("/store request:\n")

#   response = requests.get(url, headers = headers)

#   print("/store response:\n" + response.text, response.status_code, response.reason)
  
#   node = json.loads(response.text)
#   print(response.headers)
#   if response.status_code == 200:
#     return response.text
#   else:
#     return response.text


