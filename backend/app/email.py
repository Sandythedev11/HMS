from flask import render_template, current_app
from flask_mail import Message
from app import mail
from threading import Thread

def send_async_email(app, msg):
    with app.app_context():
        mail.send(msg)

def send_email(subject, recipient, html_body):
    """Send an email asynchronously"""
    msg = Message(subject, recipients=[recipient])
    msg.html = html_body
    
    # Get the current application context
    app = current_app._get_current_object()
    
    # Send email in a background thread
    Thread(target=send_async_email, args=(app, msg)).start()

def send_otp_email(email, otp_code):
    """Send an OTP verification email"""
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h2 style="color: #4a5568; text-align: center;">Hostel Management System</h2>
        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #2d3748; margin-bottom: 15px;">Email Verification Code</h3>
            <p style="color: #4a5568; margin-bottom: 20px;">Thank you for registering with our Hostel Management System. Please use the following code to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2b6cb0; background-color: #ebf4ff; padding: 15px; border-radius: 5px; display: inline-block;">
                    {otp_code}
                </div>
            </div>
            <p style="color: #4a5568; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <p style="color: #4a5568; margin-top: 30px;">If you didn't request this email, please ignore it.</p>
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 20px;">
            &copy; {2023} Hostel Management System. All rights reserved.
        </p>
    </div>
    """
    
    send_email("HMS Email Verification", email, html_content) 

def send_password_reset_otp_email(email, otp_code):
    """Send a password reset OTP email"""
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h2 style="color: #4a5568; text-align: center;">Hostel Management System</h2>
        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #2d3748; margin-bottom: 15px;">Password Reset Verification Code</h3>
            <p style="color: #4a5568; margin-bottom: 20px;">You have requested to reset your password for your HMS account. Please use the following code to verify your identity:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; background-color: #fef2f2; padding: 15px; border-radius: 5px; display: inline-block;">
                    {otp_code}
                </div>
            </div>
            <p style="color: #4a5568; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <p style="color: #dc2626; margin-top: 20px; font-weight: bold;">If you didn't request a password reset, please ignore this email and contact support immediately.</p>
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 20px;">
            &copy; {2023} Hostel Management System. All rights reserved.
        </p>
    </div>
    """
    
    send_email("HMS Password Reset", email, html_content) 