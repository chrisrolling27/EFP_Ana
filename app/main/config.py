import os
import sqlite3

from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())


def get_port():
    return os.environ.get("PORT", 8080)


def get_adyen_merchant_account():
    adyen_merchant_account = os.environ.get("ADYEN_MERCHANT_ACCOUNT")

    if not adyen_merchant_account:
        raise Exception("Missing ADYEN_MERCHANT_ACCOUNT in .env")

    return adyen_merchant_account


def get_adyen_api_key():
    adyen_api_key = os.environ.get("ADYEN_API_KEY")

    if not adyen_api_key:
        raise Exception("Missing ADYEN_API_KEY in .env")

    return adyen_api_key


def get_basic_lem_auth():
    basic_lem_auth = os.environ.get("LEM_AUTH")

    if not basic_lem_auth:
        raise Exception("Missing LEM_AUTH in .env")

    return basic_lem_auth

def get_lem_user():
    lem_user = os.environ.get("LEM_USER")

    if not lem_user:
        raise Exception("Missing LEM_USER in .env")

    return lem_user

def get_lem_pass():
    lem_pass = os.environ.get("LEM_PASS")

    if not lem_pass:
        raise Exception("Missing LEM_PASS in .env")

    return lem_pass

def get_bp_user():
    bp_user = os.environ.get("BP_USER")

    if not bp_user:
        raise Exception("Missing BP_USER in .env")

    return bp_user

def get_bp_pass():
    bp_pass = os.environ.get("BP_PASS")

    if not bp_pass:
        raise Exception("Missing BP_PASS in .env")

    return bp_pass

def get_adyen_hmac_key():
    adyen_hmac_key = os.environ.get("ADYEN_HMAC_KEY")

    if not adyen_hmac_key:
        raise Exception("Missing ADYEN_HMAC_KEY in .env")

    return adyen_hmac_key
###
# Credentials for AmazonPay
def get_amazon_merchant_account():
    amazon_merchant_account = os.environ.get("AMAZON_MERCHANT_ACCOUNT")

    if not amazon_merchant_account:
        raise Exception("Missing AMAZON_MERCHANT_ACCOUNT in .env")

    return amazon_merchant_account

def get_amazon_api_key():
    amazon_api_key = os.environ.get("AMAZON_API_KEY")

    if not amazon_api_key:
        raise Exception("Missing AMAZON_API_KEY in .env")

    return amazon_api_key

def get_amazon_client_key():
    amazon_client_key = os.environ.get("AMAZON_CLIENT_KEY")

    if not amazon_client_key:
        raise Exception("Missing AMAZON_CLIENT_KEY in .env")

    return amazon_client_key
###

def get_supported_integration():
    return ['dropin', 'card', 'ideal', 'klarna', 'directEbanking', 'alipay', 'boletobancario',
                          'sepadirectdebit', 'dotpay', 'giropay', 'ach', 'paypal', 'applepay', 'googlepay', 'clearpay']


    # Check to make sure variables are set
    # if not merchant_account or not checkout_apikey or not client_key or not hmac_key:
    #     raise Exception("Incomplete configuration in .env")