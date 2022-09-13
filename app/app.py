import logging

from Adyen.util import is_valid_hmac_notification
from flask import Flask, render_template, send_from_directory, request, redirect, url_for, abort

from main.register import legal_entity
from main.onboard import go_to_link
from main.config import *

legalName =""

def create_app():
    logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', level=logging.INFO)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    app = Flask('app')

    # Register 404 handler
    app.register_error_handler(404, page_not_found)

    # Routes:
    @app.route('/')
    def home():
        return render_template('login.html')

    @app.route('/login')
    def login():
        return render_template('login.html')
    
    @app.route('/registerForm')
    def registerForm():
        return render_template('registerForm.html')

    @app.route('/ledata', methods=['POST'])
    def legal_entities():
        if request.method == 'POST':
            legalName = request.form['legalName']
            email = request.form['email']
            password = request.form['password']
            currency = request.form['currency']
            country = request.form['country']
        return legal_entity(legalName, currency, country)


    @app.route('/result/success', methods=['GET', 'POST'])
    def onboard_success():
        lem = request.args['LEMid']
        return render_template('onboard-success.html', lem=lem)

    @app.route('/onboard/<lem>', methods=['POST', 'GET'])
    def onboard_link(lem):
        if request.method == 'POST':
            LEMid = lem
            # LEMid = request.args.get('LEMid', default = '*', type = str)
        return go_to_link(LEMid)

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
                                   'img/banana.png')

    return app


def page_not_found(error):
    return render_template('error.html'), 404


if __name__ == '__main__':
    web_app = create_app()

    logging.info(f"Running on http://localhost:{get_port()}")
    web_app.run(debug=True, port=get_port(), host='0.0.0.0')


