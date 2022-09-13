import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass
from flask import Flask, render_template, url_for, redirect

'''
MoR onboarding Flow
'''

def go_to_link(LEMid):
  url = f'https://kyc-test.adyen.com/lem/v2/legalEntities/{LEMid}/onboardingLinks'

  user = get_lem_user()
  password = get_lem_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
  "redirectUrl": "http://localhost:8080"
  }
  print("url:" + str(url))
  print("/onboardingLinks request:\n" + str(payload))

  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/onboardingLinks response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  goToUrl = node['url']
  print(goToUrl)
  print(response.headers)
  if response.status_code == 200:
    return redirect(goToUrl)
  else:
    return response.text



#adyen_payment_links()
