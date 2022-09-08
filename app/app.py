import logging

from Adyen.util import is_valid_hmac_notification
from flask import Flask, render_template, send_from_directory, request, redirect, url_for, abort

from main.legalEntities import legal_entity
from main.config import *


def create_app():
    logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', level=logging.INFO)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    app = Flask('app')

    # Register 404 handler
    app.register_error_handler(404, page_not_found)

    # Routes:
    @app.route('/')
    def home():
        return render_template('home.html')

    @app.route('/holders')
    def holders():
        return render_template('holders.html')

    @app.route('/ledata', methods=['POST'])
    def legal_entities():
        if request.method == 'POST':
            legalName = request.form['legalName']
            regNumber = request.form['regNumber']
            vatNumber = request.form['vatNumber']
            orgType = request.form['orgType']
            city = request.form['city']
            country = request.form['country']
            postalCode = request.form['postalCode']
            stateProv = request.form['stateProv']
            street = request.form['street']
        return legal_entity(legalName, regNumber, vatNumber, orgType, city, country, postalCode, stateProv, street)
        # return render_template('ledata.html')


    @app.route('/api/handleShopperRedirect', methods=['POST', 'GET'])
    def handle_redirect():
        values = request.values.to_dict()  # Get values from query params in request object
        details_request = {}

        if "payload" in values:
            details_request["details"] = {"payload": values["payload"]}
        elif "redirectResult" in values:
            details_request["details"] = {"redirectResult": values["redirectResult"]}

        redirect_response = handle_shopper_redirect(details_request)

        # Redirect shopper to landing page depending on payment success/failure
        if redirect_response["resultCode"] == 'Authorised':
            print ('I reach here')
            return redirect(url_for('checkout_success'))
        elif redirect_response["resultCode"] == 'Received' or redirect_response["resultCode"] == 'Pending':
            return redirect(url_for('checkout_pending'))
        else:
            return redirect(url_for('checkout_failure'))


    @app.route('/result/success', methods=['GET'])
    def checkout_success():
        return render_template('checkout-success.html')

    @app.route('/result/failed', methods=['GET'])
    def checkout_failure():
        return render_template('checkout-failed.html')

    @app.route('/result/pending', methods=['GET'])
    def checkout_pending():
        return render_template('checkout-success.html')

    @app.route('/result/error', methods=['GET'])
    def checkout_error():
        return render_template('checkout-failed.html')

    # Process incoming webhook notifications
    @app.route('/api/webhooks/notifications', methods=['POST'])
    def webhook_notifications():
        """
        Receives outcome of each payment
        :return:
        """
        notifications = request.json['notificationItems']

        for notification in notifications:
            if is_valid_hmac_notification(notification['NotificationRequestItem'], get_adyen_hmac_key()) :
                print(f"merchantReference: {notification['NotificationRequestItem']['merchantReference']} "
                      f"result? {notification['NotificationRequestItem']['success']}")
            else:
                # invalid hmac: do not send [accepted] response
                raise Exception("Invalid HMAC signature")

        return '[accepted]'

    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory(os.path.join(app.root_path, 'static'),
                                   'img/favicon.ico')

    return app


def page_not_found(error):
    return render_template('error.html'), 404


if __name__ == '__main__':
    web_app = create_app()

    logging.info(f"Running on http://localhost:{get_port()}")
    web_app.run(debug=True, port=get_port(), host='0.0.0.0')


