from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from sqlalchemy import func, Column, Integer, Float, String, Text, DateTime, Enum, ForeignKey, text
from sqlalchemy.exc import IntegrityError
from urllib.parse import quote_plus
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from io import BytesIO
import io
import os
import json
import secrets
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import traceback


app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'print_on_demand_secret_key_123'

password = quote_plus("Admin@135")

app.config['SQLALCHEMY_DATABASE_URI'] = (f"mysql+pymysql://root:{password}@localhost/print_on_demand"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app, supports_credentials=True)

# Helper function to get server IP address
def get_server_ip():
    try:
        # Connect to external server to detect local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        # Fallback to localhost
        return '127.0.0.1'

# ==================== INITIALIZE DATABASE ====================
# Auto-create all tables on startup
with app.app_context():
    try:
        db.create_all()
        print("\n✅ Database tables initialized successfully!")
    except Exception as e:
        print(f"\n⚠️ Database initialization warning: {str(e)}")

# ==================== MODELS ====================

# Customer Model - Matching Database Schema
class Customer(db.Model):
    __tablename__ = 'customer'
    
    id = db.Column('c_id', db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column('contact', db.String(15), nullable=False)
    address = db.Column(db.Text, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum('active', 'inactive'), default='active')
    created_at = db.Column('cdate', db.DateTime, default=datetime.utcnow)
    updated_at = db.Column('udate', db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # âœ… FIXED
    orders = db.relationship(
        'Order',
        back_populates='customer',
        lazy=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Password Reset Token Model
class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_token'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.c_id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    
    customer = db.relationship('Customer', backref='reset_tokens')

# Category Model (mapped to existing DB `category` table)
class Category(db.Model):
    __tablename__ = 'category'
    
    id = db.Column('cat_id', db.Integer, primary_key=True)
    name = db.Column('cat_name', db.String(100), nullable=False)
    image = db.Column('cat_image', db.String(255))
    status = db.Column(db.Enum('active', 'inactive'), default='active')
    created_at = db.Column('cdate', db.DateTime, default=datetime.utcnow)
    updated_at = db.Column('udate', db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = db.relationship('Product', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'image': self.image,
            'status': self.status
        }

# Product Model (mapped to existing DB `product` table)
class Product(db.Model):
    __tablename__ = 'product'
    
    id = db.Column('p_id', db.Integer, primary_key=True)
    category_id = db.Column('cat_id', db.Integer, db.ForeignKey('category.cat_id'), nullable=False)
    name = db.Column('p_name', db.String(200), nullable=False)
    image = db.Column('image', db.String(255), nullable=False)
    price = db.Column('price', db.Float, nullable=False)
    description = db.Column('details', db.Text)
    status = db.Column(db.Enum('active', 'inactive'), default='active')
    created_at = db.Column('cdate', db.DateTime, default=datetime.utcnow)
    updated_at = db.Column('udate', db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category_id': self.category_id,
            'category': self.category.name if self.category else None,
            'name': self.name,
            'image': self.image,
            'price': float(self.price) if self.price is not None else None,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Order Model - Matching Database Schema (using SQLAlchemy Column for proper mapping)
class Order(db.Model):
    __tablename__ = 'orders'
    
    id = Column('o_id', Integer, primary_key=True)
    customer_id = Column('c_id', Integer, ForeignKey('customer.c_id'), nullable=False)
    total_qty = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    address = Column(Text, nullable=False)
    contact = Column(String(15), nullable=True)
    payment_method = Column(String(50), nullable=True, default='cod')
    payment_done = Column(db.Boolean, default=False)
    status = Column(Enum('pending', 'processing', 'shipped', 'delivered', 'cancelled'), default='pending')
    created_at = Column('cdate', DateTime, default=datetime.utcnow)
    updated_at = Column('udate', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', back_populates='orders')
    order_details = db.relationship('OrderDetail', back_populates='order', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,
            'total_qty': self.total_qty,
            'total_price': float(self.total_price),
            'address': self.address,
            'status': self.status,
            'payment_done': self.payment_done,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'items': [d.to_dict() for d in self.order_details]
        }

# Order Detail Model - Matching Database Schema
class OrderDetail(db.Model):
    __tablename__ = 'order_details'
    
    id = Column('od_id', Integer, primary_key=True)
    order_id = Column('o_id', Integer, ForeignKey('orders.o_id'), nullable=False)
    product_id = Column('p_id', Integer, ForeignKey('product.p_id'), nullable=False)
    quantity = Column('qty', Integer, nullable=False)
    price = Column(Float, nullable=False)
    design = Column('design', Text, nullable=True)

    # Relationships
    order = db.relationship('Order', back_populates='order_details')
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_image': self.product.image if self.product else None,
            'quantity': self.quantity,
            'price': float(self.price),
            'design': self.design and (json.loads(self.design) if isinstance(self.design, str) else self.design) or None
        }

# Feedback Model
class Feedback(db.Model):
    __tablename__ = 'feedback'
    
    # Map to actual DB columns: primary key is `f_id`, contact column is `contact`, timestamps `cdate`
    id = db.Column('f_id', db.Integer, primary_key=True)
    name = db.Column('name', db.String(200), nullable=False)
    email = db.Column('email', db.String(100), nullable=True)
    phone = db.Column('contact', db.String(15), nullable=True)
    subject = db.Column('subject', db.String(200), nullable=True)
    message = db.Column('message', db.Text, nullable=False)
    # DB uses enum('show','hide') â€” store as string
    status = db.Column('status', db.String(32), default='show')
    created_at = db.Column('cdate', db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'subject': self.subject,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Admin Model
class Admin(db.Model):
    __tablename__ = 'admin'

    id = db.Column('a_id', db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    contact = db.Column('contact', db.String(15))
    created_at = db.Column('cdate', db.DateTime, default=datetime.utcnow)

# ==================== PRODUCT REVIEW MODEL ====================

class ProductReview(db.Model):
    __tablename__ = 'product_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.p_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.c_id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    review_text = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum('pending', 'approved', 'rejected'), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = db.relationship('Product', backref='reviews')
    customer = db.relationship('Customer', backref='reviews')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'customer_id': self.customer_id,
            'rating': self.rating,
            'review_text': self.review_text,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'customer_name': self.customer.name if self.customer else 'Anonymous',
            'product_name': self.product.name if self.product else 'Unknown Product'
        }

# ==================== RETURN REQUEST MODEL ====================

class ReturnRequest(db.Model):
    __tablename__ = 'return_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.o_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.c_id'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    return_type = db.Column(db.Enum('return', 'exchange'), default='return')
    status = db.Column(db.Enum('pending', 'approved', 'rejected', 'completed'), default='pending')
    admin_notes = db.Column(db.Text, nullable=True)
    image_filenames = db.Column(db.Text, nullable=True)  # Old column: comma-separated image filenames
    video_filename = db.Column(db.String(255), nullable=True)  # Old column: single video filename
    media_files = db.Column(db.Text, nullable=True)  # New column: combined comma-separated list
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    order = db.relationship('Order', backref='return_requests')
    customer = db.relationship('Customer', backref='return_requests')
    
    def get_media_list(self):
        """Returns structured list of all media files with their types"""
        media_list = []
        
        # Get from image_filenames (old column)
        if self.image_filenames:
            for img in self.image_filenames.split(','):
                img = img.strip()
                if img:
                    media_list.append({
                        'filename': img,
                        'type': 'image',
                        'url': f'/static/uploads/returns/{img}'
                    })
        
        # Get from video_filename (old column)
        if self.video_filename:
            video = self.video_filename.strip()
            if video:
                media_list.append({
                    'filename': video,
                    'type': 'video',
                    'url': f'/static/uploads/returns/{video}'
                })
        
        # Get from media_files (new column) - avoid duplicates
        if self.media_files:
            existing_files = {m['filename'] for m in media_list}
            for media in self.media_files.split(','):
                media = media.strip()
                if media and media not in existing_files:
                    media_type = 'video' if media.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')) else 'image'
                    media_list.append({
                        'filename': media,
                        'type': media_type,
                        'url': f'/static/uploads/returns/{media}'
                    })
        
        return media_list
    
    def to_dict(self):
        # Get structured media list
        media_list = self.get_media_list()
        
        # Combine all filenames for backward compatibility
        all_media_files = [m['filename'] for m in media_list]
        
        # Get order details
        order_info = {}
        if self.order:
            order_info = {
                'id': self.order.id,
                'total_price': float(self.order.total_price),
                'total_qty': self.order.total_qty,
                'address': self.order.address,
                'status': self.order.status,
                'payment_method': self.order.payment_method,
                'items': [
                    {
                        'product_name': item.product.name if item.product else 'Unknown',
                        'product_image': item.product.image if item.product else None,
                        'quantity': item.quantity,
                        'price': float(item.price)
                    } for item in self.order.order_details
                ] if self.order.order_details else []
            }
        
        return {
            'id': self.id,
            'order_id': self.order_id,
            'customer_id': self.customer_id,
            'reason': self.reason,
            'return_type': self.return_type,
            'status': self.status,
            'admin_notes': self.admin_notes,
            'media_files': ','.join(all_media_files) if all_media_files else None,
            'media_list': media_list,  # Structured list with types and URLs
            'image_filenames': self.image_filenames,
            'video_filename': self.video_filename,
            'order': order_info,  # Add full order details
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# ==================== PAGE ROUTES ====================

# Home Route
@app.route('/')
def index():
    return render_template('index.html')

# About Page
@app.route('/about')
def about():
    return render_template('about.html')

# Services Page
@app.route('/services')
def services():
    return render_template('services.html')

# Contact Page
@app.route('/contact')
def contact():
    return render_template('contact.html')

# Products Page
@app.route('/products')
def products():
    return render_template('products.html')

@app.route('/designproduct')
def design_product():
    return render_template('designproduct.html')


# Cart Page
@app.route('/cart')
def cart():
    return render_template('cart.html')

# Sign In Page
@app.route('/signin')
def signin():
    return render_template('signin.html')

# Sign Up Page
@app.route('/signup')
def signup():
    return render_template('signup.html')

# My Orders Page (server-side fallback data)
@app.route('/myorders')
def myorders():
    # If customer is logged in via session, fetch orders server-side
    customer_id = session.get('customer_id')
    orders_data = None
    if customer_id:
        try:
            orders = Order.query.filter_by(customer_id=customer_id).order_by(Order.created_at.desc()).all()
            orders_data = [o.to_dict() for o in orders]
        except Exception:
            orders_data = None

    return render_template('myorders.html', orders_json=(orders_data and __import__('json').dumps(orders_data) or 'null'))

# Returns Page
@app.route('/returns')
def returns():
    if 'customer_id' not in session:
        return redirect(url_for('signin'))
    return render_template('returns.html')

# Admin Login Page
@app.route('/admin/login')
def admin_login_page():
    return render_template('admin-login.html')

# Admin Dashboard
@app.route('/admin/dashboard')
def admin_dashboard():
    return render_template('admin-dashboard.html')

# Admin Products
@app.route('/admin/products')
def admin_products():
    return render_template('admin-products.html')

# Admin Orders
@app.route('/admin/orders')
def admin_orders():
    return render_template('admin-orders.html')

# Admin Customers
@app.route('/admin/customers')
def admin_customers():
    return render_template('admin-customers.html')

# Admin Categories
@app.route('/admin/categories')
def admin_categories():
    return render_template('admin-categories.html')

# Admin Feedback
@app.route('/admin/feedback')
def admin_feedback():
    return render_template('admin-feedback.html')

# Admin Reviews
@app.route('/admin/reviews')
def admin_reviews():
    return render_template('admin-reviews.html')

# Admin Reports
@app.route('/admin/reports')
def admin_reports():
    return render_template('admin-reports.html')

# Admin Returns
@app.route('/admin/returns')
def admin_returns_page():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login_page'))
    return render_template('admin-returns.html')

# ==================== CUSTOMER ROUTES ====================


# Customer Registration
@app.route('/api/customer/register', methods=['POST'])
def customer_register():
    try:
        data = request.get_json()
        
        # Check if email already exists
        existing_customer = Customer.query.filter_by(email=data['email']).first()
        if existing_customer:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Hash password
        hashed_password = generate_password_hash(data['password'])
        
        # Create new customer
        new_customer = Customer(
            name=data['name'],
            email=data['email'],
            phone=data['phone'],
            address=data['address'],
            password=hashed_password
        )
        
        db.session.add(new_customer)
        db.session.commit()
        
        # Send registration confirmation email
        registration_email_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin-bottom: 20px;">Welcome to Print On Demand! 🎉</h2>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Hi <strong>{new_customer.name}</strong>,</p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Thank you for registering with us! Your account has been successfully created.</p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">You can now browse our products, customize designs, and place orders.</p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Account Details:</p>
                    <ul style="color: #555; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
                        <li><strong>Email:</strong> {new_customer.email}</li>
                        <li><strong>Name:</strong> {new_customer.name}</li>
                        <li><strong>Registration Date:</strong> {datetime.now().strftime('%d %b %Y')}</li>
                    </ul>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">If you have any questions, feel free to contact us.</p>
                    <p style="color: #999; font-size: 14px;">Best regards,<br><strong>Print On Demand Team</strong></p>
                </div>
            </body>
        </html>
        """
        send_email(new_customer.email, "Welcome to Print On Demand!", registration_email_body)
        
        return jsonify({
            'message': 'Registration successful',
            'customer': new_customer.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


# Customer Login
@app.route('/api/customer/login', methods=['POST'])
def customer_login():
    try:
        data = request.get_json()
        
        customer = Customer.query.filter_by(email=data['email']).first()
        
        if customer and check_password_hash(customer.password, data['password']):
            session['customer_id'] = customer.id
            return jsonify({
                'message': 'Login successful',
                'customer': customer.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Customer Logout
@app.route('/api/customer/logout', methods=['POST'])
def customer_logout():
    session.pop('customer_id', None)
    return jsonify({'message': 'Logout successful'}), 200

# ==================== PASSWORD RESET ROUTES ====================

# Helper function to send email
def send_email(to_email, subject, html_body):
    try:
        # DEMO MODE: Temporarily store emails to file instead of sending
        DEMO_MODE = False  # Set to False when Gmail auth is fixed
        
        if DEMO_MODE:
            print(f"\n🔄 DEMO MODE: Email saved to database...")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            # Simulate sending by just returning True
            print(f"✅ Email would be sent to: {to_email}\n")
            return True
        
        # Gmail SMTP credentials
        sender_email = "printondemand086@gmail.com"
        sender_password = "udinruzlumfzdymm"  # App-specific password (16 chars)
        
        print(f"\n🔄 Attempting to send email...")
        print(f"From: {sender_email}")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        
        # Send email via Gmail SMTP
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = to_email
        
        part = MIMEText(html_body, 'html')
        msg.attach(part)
        
        print("📤 Connecting to Gmail SMTP...")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            print("🔐 Logging in...")
            server.login(sender_email, sender_password)
            print("✉️ Sending email...")
            server.sendmail(sender_email, to_email, msg.as_string())
        
        print(f"✅ Email sent successfully to: {to_email}\n")
        return True
    except Exception as e:
        print(f"\n❌ Email Error: {str(e)}")
        print(f"Error Type: {type(e).__name__}\n")
        return False

# Forgot Password Page
@app.route('/forgot-password')
def forgot_password():
    return render_template('forgot-password.html')

# Request Password Reset
@app.route('/api/customer/forgot-password', methods=['POST'])
def request_password_reset():
    try:
        data = request.get_json()
        email = data.get('email')
        
        customer = Customer.query.filter_by(email=email).first()
        if not customer:
            # Don't reveal if email exists or not (security best practice)
            return jsonify({'message': 'If email exists, reset link has been sent'}), 200
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Delete any existing tokens for this customer
        PasswordResetToken.query.filter_by(customer_id=customer.id, is_used=False).delete()
        
        # Create new reset token
        reset_token_obj = PasswordResetToken(
            customer_id=customer.id,
            token=reset_token,
            expires_at=expires_at
        )
        db.session.add(reset_token_obj)
        db.session.commit()
        
        # Create reset link using actual server IP so it works on mobile
        server_ip = get_server_ip()
        reset_link = f"http://{server_ip}:5000/reset-password/{reset_token}"
        
        # Send email
        subject = "Password Reset Request"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
                    <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                    <p style="color: #666; font-size: 16px;">Hello {customer.name},</p>
                    <p style="color: #666; font-size: 16px;">Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="color: #999; font-size: 14px; text-align: center;">This link will expire in 1 hour.</p>
                    <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
                    <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>Print On Demand Team</p>
                </div>
            </body>
        </html>
        """
        
        email_sent = send_email(customer.email, subject, html_body)
        if not email_sent:
            return jsonify({'error': 'Failed to send email. Please try again later.'}), 500
        
        return jsonify({'message': 'Password reset link has been sent to your email'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Reset Password Page
@app.route('/reset-password/<path:token>')
def reset_password_page(token):
    # Verify token exists and is not expired
    reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
    
    if not reset_token:
        return render_template('reset-password.html', token=token, valid=False, message="Invalid or expired reset link")
    
    if datetime.utcnow() > reset_token.expires_at:
        return render_template('reset-password.html', token=token, valid=False, message="Reset link has expired")
    
    return render_template('reset-password.html', token=token, valid=True)

# Verify Reset Token
@app.route('/api/customer/verify-reset-token/<token>', methods=['GET'])
def verify_reset_token(token):
    try:
        reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
        
        if not reset_token:
            return jsonify({'valid': False, 'message': 'Invalid token'}), 400
        
        if datetime.utcnow() > reset_token.expires_at:
            return jsonify({'valid': False, 'message': 'Token expired'}), 400
        
        return jsonify({'valid': True, 'message': 'Token is valid'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Reset Password
@app.route('/api/customer/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and password are required'}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
        
        if not reset_token:
            return jsonify({'error': 'Invalid token'}), 400
        
        if datetime.utcnow() > reset_token.expires_at:
            return jsonify({'error': 'Token has expired'}), 400
        
        # Update password
        customer = reset_token.customer
        customer.password = generate_password_hash(new_password)
        
        # Mark token as used
        reset_token.is_used = True
        
        db.session.commit()
        
        return jsonify({'message': 'Password reset successful'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Customer Profile
@app.route('/api/customer/profile', methods=['GET'])
def get_customer_profile():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        return jsonify({'customer': customer.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Change Customer Password
@app.route('/api/customer/change-password', methods=['POST'])
def change_password():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not old_password or not new_password or not confirm_password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'error': 'New passwords do not match'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Verify old password
        if not check_password_hash(customer.password, old_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Update password
        customer.password = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Place Order
@app.route('/api/orders', methods=['POST'])
def place_order():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'error': 'Cart is empty'}), 400
        
        if not data.get('address'):
            return jsonify({'error': 'Delivery address is required'}), 400
        
        if not data.get('contact'):
            return jsonify({'error': 'Contact number is required'}), 400
        
        # Create order
        new_order = Order(
            customer_id=customer_id,
            total_qty=data.get('total_qty', 0),
            total_price=data.get('total_price', 0),
            address=data['address'],
            contact=data.get('contact'),
            payment_method=data.get('payment_method', 'cod'),
            status='pending'
        )
        
        db.session.add(new_order)
        db.session.flush()  # Flush to get the order ID
        
        # Add order details for each item
        for item in data.get('items', []):
            # Validate product_id exists - check both 'id' and 'product_id' fields
            product_id = item.get('id') or item.get('product_id')
            if not product_id:
                raise ValueError(f"Product ID missing from cart item: {item}")
            
            # Ensure product_id is an integer
            try:
                product_id = int(product_id)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid product ID: {product_id}")
            
            # Verify product exists
            product = Product.query.get(product_id)
            if not product:
                raise ValueError(f"Product with ID {product_id} not found")
            
            order_detail = OrderDetail(
                order_id=new_order.id,
                product_id=product_id,
                quantity=item.get('quantity', 1),
                price=item.get('price', 0) or product.price,
                design=json.dumps(item.get('design')) if item.get('design') else None
            )
            db.session.add(order_detail)
        
        db.session.commit()
        
        # Send order confirmation email
        customer = Customer.query.get(customer_id)
        if customer:
            order_items_html = ""
            for detail in new_order.order_details:
                product_name = detail.product.name if detail.product else "Unknown Product"
                order_items_html += f"""
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; text-align: left;">{product_name}</td>
                    <td style="padding: 12px; text-align: center;">{detail.quantity}</td>
                    <td style="padding: 12px; text-align: right;">Rs. {detail.price:.2f}</td>
                </tr>
                """
            
            order_email_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-bottom: 20px;">Order Confirmation ✓</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Hi <strong>{customer.name}</strong>,</p>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for your order! We've received it and will process it shortly.</p>
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                            <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;"><strong>Order ID:</strong> #{new_order.id}</p>
                            <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;"><strong>Order Date:</strong> {new_order.created_at.strftime('%d %b %Y, %H:%M')}</p>
                            <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;"><strong>Delivery Address:</strong> {new_order.address}</p>
                            <p style="color: #333; font-size: 14px; margin: 0;"><strong>Contact:</strong> {new_order.contact}</p>
                        </div>
                        
                        <h3 style="color: #333; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Order Items</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="background-color: #f0f0f0;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order_items_html}
                            </tbody>
                        </table>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #555;">Total Items:</span>
                                <strong style="color: #333;">{new_order.total_qty}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 2px solid #ddd; padding-top: 10px;">
                                <span style="color: #333; font-size: 16px;"><strong>Total Amount:</strong></span>
                                <strong style="color: #007bff; font-size: 18px;">Rs. {new_order.total_price:.2f}</strong>
                            </div>
                        </div>
                        
                        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">Payment Method: <strong>{new_order.payment_method.upper()}</strong></p>
                        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">We'll send you tracking information once your order is shipped. Thank you for shopping with Print On Demand!</p>
                        <p style="color: #999; font-size: 14px;">Best regards,<br><strong>Print On Demand Team</strong></p>
                    </div>
                </body>
            </html>
            """
            send_email(customer.email, f"Order Confirmation - Order #{new_order.id}", order_email_body)
        
        return jsonify({
            'message': 'Order placed successfully',
            'order_id': new_order.id,
            'order': new_order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to place order: {str(e)}'}), 500

# Get Customer Orders
@app.route('/api/customer/orders', methods=['GET'])
def get_customer_orders():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        orders = Order.query.filter_by(customer_id=customer_id).order_by(Order.created_at.desc()).all()
        return jsonify({
            'orders': [order.to_dict() for order in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Single Customer Order
@app.route('/api/customer/orders/<int:id>', methods=['GET'])
def get_customer_order(id):
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        order = Order.query.filter_by(id=id, customer_id=customer_id).first()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        return jsonify({'order': order.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Cancel Customer Order
@app.route('/api/orders/<int:id>', methods=['DELETE'])
def cancel_customer_order(id):
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        order = Order.query.filter_by(id=id, customer_id=customer_id).first()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Only allow cancellation of pending orders
        if order.status != 'pending':
            return jsonify({'error': f'Cannot cancel order with status: {order.status}'}), 400
        
        # Update order status to cancelled
        order.status = 'cancelled'
        db.session.commit()
        
        return jsonify({
            'message': 'Order cancelled successfully',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== FEEDBACK ROUTES ====================

# Submit Feedback
@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()

        new_feedback = Feedback(
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone') or data.get('contact'),
            subject=data.get('subject'),
            message=data.get('message')
        )
        
        db.session.add(new_feedback)
        db.session.commit()
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback': new_feedback.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    


# ==================== ADMIN ROUTES ====================

# Admin Login
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        
        admin = Admin.query.filter_by(username=data['username']).first()
        
        if admin and check_password_hash(admin.password, data['password']):
            session['admin_id'] = admin.id
            return jsonify({
                'message': 'Login successful',
                'admin': {
                    'id': admin.id,
                    'username': admin.username
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin Logout
@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_id', None)
    return jsonify({'message': 'Logout successful'}), 200

# Get All Customers (Admin)
@app.route('/api/admin/customers', methods=['GET'])
def admin_get_customers():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        customers = Customer.query.all()
        return jsonify({
            'customers': [customer.to_dict() for customer in customers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update Customer Status (Admin)
@app.route('/api/admin/customers/<int:id>/status', methods=['PUT'])
def admin_update_customer_status(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        customer = Customer.query.get(id)
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        customer.status = data['status']
        db.session.commit()
        
        return jsonify({
            'message': 'Customer status updated',
            'customer': customer.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get All Orders (Admin)
@app.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify({
            'orders': [order.to_dict() for order in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update Order Status (Admin)
@app.route('/api/admin/orders/<int:id>/status', methods=['PUT'])
def admin_update_order_status(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        order = Order.query.get(id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        old_status = order.status
        order.status = data['status']
        db.session.commit()
        
        # Send status update email to customer
        if order.customer:
            status_messages = {
                'pending': 'Your order is pending and will be processed soon.',
                'processing': 'Your order is being processed and will be shipped shortly.',
                'shipped': 'Your order has been shipped! You can track it using the tracking number.',
                'delivered': 'Your order has been delivered. Thank you for shopping with us!',
                'cancelled': 'Your order has been cancelled. Please contact us for more information.'
            }
            
            status_msg = status_messages.get(order.status, f'Your order status has been updated to {order.status}')
            
            # Create status-specific email body
            status_colors = {
                'pending': '#FF9800',
                'processing': '#2196F3',
                'shipped': '#4CAF50',
                'delivered': '#8BC34A',
                'cancelled': '#F44336'
            }
            status_color = status_colors.get(order.status, '#333')
            
            status_email_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-bottom: 20px;">Order Status Update 📦</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi <strong>{order.customer.name}</strong>,</p>
                        
                        <div style="background-color: {status_color}; color: white; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
                            <p style="font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase;">{order.status}</p>
                        </div>
                        
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">{status_msg}</p>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid {status_color};">
                            <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;"><strong>Order ID:</strong> #{order.id}</p>
                            <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;"><strong>Previous Status:</strong> {old_status.capitalize()}</p>
                            <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;"><strong>Current Status:</strong> <span style="color: {status_color}; font-weight: bold;">{order.status.upper()}</span></p>
                            <p style="color: #333; font-size: 14px; margin: 0;"><strong>Updated At:</strong> {datetime.now().strftime('%d %b %Y, %H:%M')}</p>
                        </div>
                        
                        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <p style="color: #0066cc; font-size: 14px; margin: 0;"><strong>Delivery Address:</strong><br>{order.address}</p>
                        </div>
                        
                        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">Total Amount: <strong>Rs. {order.total_price:.2f}</strong></p>
                        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">If you have any questions about your order, please feel free to contact us.</p>
                        <p style="color: #999; font-size: 14px;">Best regards,<br><strong>Print On Demand Team</strong></p>
                    </div>
                </body>
            </html>
            """
            send_email(order.customer.email, f"Order Status Update - Order #{order.id}", status_email_body)
        
        return jsonify({
            'message': 'Order status updated',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Toggle Payment Done (Admin)
@app.route('/api/admin/orders/<int:id>/payment-done', methods=['PUT'])
def admin_toggle_payment_done(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        order = Order.query.get(id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        order.payment_done = not order.payment_done
        db.session.commit()
        
        return jsonify({
            'message': 'Payment status updated',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get All Active Products (Customer) - Returns only active products
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = Product.query.filter_by(status='active').all()
        return jsonify({
            'products': [product.to_dict() for product in products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# Get Single Product (Customer) - For design page
@app.route('/api/products/<int:id>', methods=['GET'])
def get_product(id):
    try:
        product = Product.query.filter_by(id=id, status='active').first()

        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify({
            'product': product.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get All Products (Admin) - Returns all products including inactive
@app.route('/api/admin/products', methods=['GET'])
def admin_get_products():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        products = Product.query.all()
        return jsonify({
            'products': [product.to_dict() for product in products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add Product (Admin)
@app.route('/api/admin/products', methods=['POST'])
def admin_add_product():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        
        # Ensure status is always 'active' or 'inactive', default to 'active'
        product_status = data.get('status', 'active')
        if product_status not in ['active', 'inactive']:
            product_status = 'active'
        
        new_product = Product(
            category_id=data['category_id'],
            name=data['name'],
            image=data['image'],
            price=data['price'],
            description=data.get('description'),
            status=product_status
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        return jsonify({
            'message': 'Product added successfully',
            'product': new_product.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Update Product (Admin)
@app.route('/api/admin/products/<int:id>', methods=['PUT'])
def admin_update_product(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        product = Product.query.get(id)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        product.category_id = data.get('category_id', product.category_id)
        product.name = data.get('name', product.name)
        product.image = data.get('image', product.image)
        product.price = data.get('price', product.price)
        product.description = data.get('description', product.description)
        
        # Ensure status is always 'active' or 'inactive'
        if 'status' in data:
            product_status = data.get('status')
            if product_status in ['active', 'inactive']:
                product.status = product_status
            else:
                product.status = 'active' if not product.status else product.status
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product updated successfully',
            'product': product.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Delete Product (Admin)
@app.route('/api/admin/products/<int:id>', methods=['DELETE'])
def admin_delete_product(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401

        product = Product.query.get(id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        try:
            db.session.delete(product)
            db.session.commit()
            return jsonify({'message': 'Product deleted successfully'}), 200
        except IntegrityError:
            # IntegrityError usually means related rows (e.g., order_details) reference this product.
            db.session.rollback()
            try:
                # Remove referencing order_details rows so product can be deleted.
                # WARNING: this will remove order line-items for orders that referenced this product.
                db.session.execute(text("DELETE FROM order_details WHERE p_id = :pid"), {'pid': id})
                db.session.delete(product)
                db.session.commit()
                return jsonify({'message': 'Product and related order details deleted'}), 200
            except Exception as e:
                db.session.rollback()
                return jsonify({'error': f'Failed to delete product due to related records: {str(e)}'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


 

# ==================== PRODUCT REVIEWS ENDPOINTS ====================

# Customer: Submit Review
@app.route('/api/reviews/submit', methods=['POST'])
def submit_review():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Please login to submit a review'}), 401
        
        data = request.get_json()
        product_id = data.get('product_id')
        rating = data.get('rating')
        review_text = data.get('review_text', '')
        
        if not product_id or not rating:
            return jsonify({'error': 'Product ID and rating are required'}), 400
        
        if not (1 <= int(rating) <= 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if customer already reviewed this product
        existing_review = ProductReview.query.filter_by(
            product_id=product_id,
            customer_id=customer_id
        ).first()
        
        if existing_review:
            return jsonify({'error': 'You have already reviewed this product'}), 400
        
        # Create new review
        new_review = ProductReview(
            product_id=product_id,
            customer_id=customer_id,
            rating=int(rating),
            review_text=review_text,
            status='approved'
        )
        
        db.session.add(new_review)
        db.session.commit()
        
        return jsonify({
            'message': 'Review submitted successfully',
            'review': new_review.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Customer: Get Reviews for Product
@app.route('/api/reviews/product/<int:product_id>', methods=['GET'])
def get_product_reviews(product_id):
    try:
        # Get only approved reviews
        reviews = ProductReview.query.filter_by(
            product_id=product_id,
            status='approved'
        ).order_by(ProductReview.created_at.desc()).all()
        
        return jsonify({
            'reviews': [review.to_dict() for review in reviews]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin: Get All Reviews
@app.route('/api/admin/reviews', methods=['GET'])
def admin_get_reviews():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        reviews = ProductReview.query.order_by(ProductReview.created_at.desc()).all()
        return jsonify({
            'reviews': [review.to_dict() for review in reviews]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin: Approve/Reject Review
@app.route('/api/admin/reviews/<int:review_id>', methods=['PUT'])
def admin_update_review(review_id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['approved', 'rejected', 'pending']:
            return jsonify({'error': 'Invalid status'}), 400
        
        review = ProductReview.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        review.status = new_status
        db.session.commit()
        
        return jsonify({
            'message': f'Review {new_status} successfully',
            'review': review.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Admin: Delete Review
@app.route('/api/admin/reviews/<int:review_id>', methods=['DELETE'])
def admin_delete_review(review_id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        review = ProductReview.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        db.session.delete(review)
        db.session.commit()
        
        return jsonify({'message': 'Review deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== RETURN REQUEST ENDPOINTS ====================

# Customer: Submit Return Request
@app.route('/api/returns/submit', methods=['POST'])
def submit_return_request():
    try:
        print(f"DEBUG: Form data: {request.form.to_dict()}")
        print(f"DEBUG: Files: {list(request.files.keys())}")
        
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Please login to submit a return request'}), 401
        
        order_id = request.form.get('order_id')
        reason = request.form.get('reason')
        return_type = request.form.get('return_type', 'return')  # 'return' or 'exchange'
        
        print(f"DEBUG: order_id={order_id}, return_type={return_type}, reason={reason}")
        
        if not order_id or not reason:
            return jsonify({'error': 'Order ID and reason are required'}), 400
        
        # Check if order exists and belongs to customer
        order = Order.query.filter_by(id=int(order_id), customer_id=customer_id).first()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Check if return already exists for this order
        existing_return = ReturnRequest.query.filter_by(order_id=int(order_id)).filter(
            ReturnRequest.status.in_(['pending', 'approved'])
        ).first()
        
        if existing_return:
            return jsonify({'error': 'A return/exchange request already exists for this order'}), 400
        
        # Create returns folder if it doesn't exist
        returns_folder = 'static/uploads/returns'
        if not os.path.exists(returns_folder):
            os.makedirs(returns_folder)
        
        # Handle all media uploads (images and video together)
        image_filenames = []
        video_filename = None
        
        # Handle image uploads
        if 'images' in request.files:
            images = request.files.getlist('images')
            for image in images:
                if image and image.filename:
                    timestamp = int(datetime.utcnow().timestamp())
                    filename = secure_filename(f"{int(order_id)}_{timestamp}_{image.filename}")
                    image.save(os.path.join(returns_folder, filename))
                    image_filenames.append(filename)
        
        # Handle video upload
        if 'video' in request.files:
            video = request.files['video']
            if video and video.filename:
                timestamp = int(datetime.utcnow().timestamp())
                video_filename = secure_filename(f"{int(order_id)}_{timestamp}_{video.filename}")
                video.save(os.path.join(returns_folder, video_filename))
        
        # Create new return request (storing in both old and new columns for compatibility)
        all_media = image_filenames.copy()
        if video_filename:
            all_media.append(video_filename)
        
        new_return = ReturnRequest(
            order_id=int(order_id),
            customer_id=customer_id,
            reason=reason,
            return_type=return_type,
            status='pending',
            image_filenames=','.join(image_filenames) if image_filenames else None,
            video_filename=video_filename,
            media_files=','.join(all_media) if all_media else None
        )
        
        db.session.add(new_return)
        db.session.commit()
        
        return jsonify({
            'message': 'Return request submitted successfully',
            'return': new_return.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in submit_return_request: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Error: {str(e)}'}), 500

# Customer: Get My Returns
@app.route('/api/returns/my-returns', methods=['GET'])
def get_my_returns():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'Not authorized'}), 401
        
        returns = ReturnRequest.query.filter_by(customer_id=customer_id).order_by(ReturnRequest.created_at.desc()).all()
        
        return jsonify({
            'returns': [r.to_dict() for r in returns]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin: Get All Return Requests
@app.route('/api/admin/returns', methods=['GET'])
def admin_get_returns():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        status_filter = request.args.get('status')  # Optional filter by status
        
        if status_filter:
            returns = ReturnRequest.query.filter_by(status=status_filter).order_by(ReturnRequest.created_at.desc()).all()
        else:
            returns = ReturnRequest.query.order_by(ReturnRequest.created_at.desc()).all()
        
        return jsonify({
            'returns': [r.to_dict() for r in returns]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin: Approve/Reject Return Request
@app.route('/api/admin/returns/<int:return_id>', methods=['PUT'])
def admin_update_return(return_id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        new_status = data.get('status')  # 'approved' or 'rejected' or 'completed'
        admin_notes = data.get('admin_notes', '')
        
        if new_status not in ['approved', 'rejected', 'completed', 'pending']:
            return jsonify({'error': 'Invalid status'}), 400
        
        return_request = ReturnRequest.query.get(return_id)
        if not return_request:
            return jsonify({'error': 'Return request not found'}), 404
        
        return_request.status = new_status
        return_request.admin_notes = admin_notes
        db.session.commit()
        
        return jsonify({
            'message': f'Return request {new_status} successfully',
            'return': return_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Admin: Get Return Media Files
@app.route('/api/admin/returns/<int:return_id>/media', methods=['GET'])
def admin_get_return_media(return_id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        return_request = ReturnRequest.query.get(return_id)
        if not return_request:
            return jsonify({'error': 'Return request not found'}), 404
        
        # Get structured media list from model
        media_list = return_request.get_media_list()
        
        return jsonify({
            'media': media_list,
            'total': len(media_list)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Get All Feedback (Admin)
@app.route('/api/admin/feedback', methods=['GET'])
def admin_get_feedback():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
        return jsonify({
            'feedbacks': [feedback.to_dict() for feedback in feedbacks]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Public: Get All Feedback (no auth) - useful for debugging or public review
@app.route('/api/feedback/all', methods=['GET'])
def public_get_feedback():
    try:
        feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
        return jsonify({
            'feedbacks': [feedback.to_dict() for feedback in feedbacks]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# === Dev-only public actions (resolve / delete) - NOT for production ===
@app.route('/api/feedback/<int:id>/resolve', methods=['POST'])
def public_resolve_feedback(id):
    try:
        feedback = Feedback.query.get(id)
        if not feedback:
            return jsonify({'error': 'Feedback not found'}), 404
        feedback.status = 'hide'
        db.session.commit()
        return jsonify({'message': 'Feedback resolved', 'feedback': feedback.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback/<int:id>', methods=['DELETE'])
def public_delete_feedback(id):
    try:
        feedback = Feedback.query.get(id)
        if not feedback:
            return jsonify({'error': 'Feedback not found'}), 404
        db.session.delete(feedback)
        db.session.commit()
        return jsonify({'message': 'Feedback deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== ADMIN CATEGORY ROUTES ====================

# Get All Categories (Admin)
@app.route('/api/admin/categories', methods=['GET'])
def admin_get_categories():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        categories = Category.query.all()
        return jsonify({
            'categories': [category.to_dict() for category in categories]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add Category (Admin)
@app.route('/api/admin/categories', methods=['POST'])
def admin_add_category():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        
        # Check if category name already exists
        existing_category = Category.query.filter_by(name=data['name']).first()
        if existing_category:
            return jsonify({'error': 'Category name already exists'}), 400

        new_category = Category(
            name=data['name'],
            image=data.get('image')
        )
        
        db.session.add(new_category)
        db.session.commit()
        
        return jsonify({
            'message': 'Category added successfully',
            'category': new_category.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Update Category (Admin)
@app.route('/api/admin/categories/<int:id>', methods=['PUT'])
def admin_update_category(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        category = Category.query.get(id)
        
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        
        category.name = data.get('name', category.name)
        category.image = data.get('image', category.image)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Category updated successfully',
            'category': category.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Delete Category (Admin)
@app.route('/api/admin/categories/<int:id>', methods=['DELETE'])
def admin_delete_category(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401

        category = Category.query.get(id)

        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Check if category has products
        if category.products:
            return jsonify({'error': 'Cannot delete category with existing products'}), 400

        db.session.delete(category)
        db.session.commit()

        return jsonify({'message': 'Category deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Import orphan products referenced in order_details but missing from product table
@app.route('/api/admin/import/orphan-products', methods=['POST'])
def admin_import_orphan_products():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401

        # Find distinct p_id values in order_details that have no matching product record
        rows = db.session.execute(text("""
            SELECT DISTINCT od.p_id FROM order_details od
            LEFT JOIN product p ON od.p_id = p.p_id
            WHERE p.p_id IS NULL
        """)).fetchall()

        missing_ids = [r[0] for r in rows if r and r[0] is not None]
        if not missing_ids:
            return jsonify({'message': 'No orphan products found', 'imported': []}), 200

        # Ensure an 'Imported' category exists
        imported_cat = Category.query.filter_by(name='Imported').first()
        if not imported_cat:
            imported_cat = Category(name='Imported', image=None)
            db.session.add(imported_cat)
            db.session.commit()

        imported = []
        for pid in missing_ids:
            try:
                # Create placeholder product with same primary key id (p_id)
                p = Product(id=pid, category_id=imported_cat.id, name=f'Imported Product {pid}', image='/static/img/pf.webp', price=0.0, description='Imported from orders', status='inactive')
                db.session.add(p)
                imported.append(pid)
            except Exception:
                db.session.rollback()
                continue

        db.session.commit()
        return jsonify({'message': 'Imported orphan products', 'imported': imported}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


 

# Update Feedback Status (Admin)
@app.route('/api/admin/feedback/<int:id>/status', methods=['PUT'])
def admin_update_feedback_status(id):
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        data = request.get_json()
        feedback = Feedback.query.get(id)

        if not feedback:
            return jsonify({'error': 'Feedback not found'}), 404

        # Normalize incoming status to values supported by the DB enum (show/hide)
        incoming = (data.get('status') or '').lower()
        if incoming == 'deleted':
            # delete the feedback row
            db.session.delete(feedback)
            db.session.commit()
            return jsonify({'message': 'Feedback deleted'}), 200
        elif incoming == 'resolved':
            # Toggle resolved: if currently hidden -> show, otherwise hide
            feedback.status = 'show' if (feedback.status or '').lower() == 'hide' else 'hide'
        elif incoming in ('show', 'hide'):
            feedback.status = incoming
        else:
            # unknown status - reject
            return jsonify({'error': 'Invalid status value'}), 400

        db.session.commit()
        
        return jsonify({
            'message': 'Feedback status updated',
            'feedback': feedback.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Dashboard Stats (Admin)
@app.route('/api/admin/dashboard/stats', methods=['GET'])
def admin_dashboard_stats():
    try:
        if not session.get('admin_id'):
            return jsonify({'error': 'Not authorized'}), 401
        
        total_products = Product.query.count()
        total_orders = Order.query.count()
        total_customers = Customer.query.count()
        total_revenue = db.session.query(func.sum(Order.total_price)).scalar() or 0
        
        return jsonify({
            'total_products': total_products,
            'total_orders': total_orders,
            'total_customers': total_customers,
            'total_revenue': total_revenue
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
 # Download pdf   

@app.route('/api/admin/reports/feedback/pdf')
def admin_feedback_pdf():
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(170, height - 40, "Feedback Report")

    pdf.setFont("Helvetica", 10)
    y = height - 80

    feedbacks = Feedback.query.all()

    for f in feedbacks:
        pdf.drawString(40, y, f"ID: {f.id}")
        pdf.drawString(80, y, f"Name: {f.name}")
        pdf.drawString(220, y, f"Phone: {f.phone}")
        pdf.drawString(350, y, f"Status: {f.status}")
        y -= 20

        if y < 50:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = height - 50

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="feedback_report.pdf",
        mimetype="application/pdf"
    )


@app.route('/api/admin/reports/revenue/pdf')
def admin_revenue_pdf():
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(170, height - 40, "Revenue Report")

    pdf.setFont("Helvetica", 12)
    y = height - 100

    total_orders = Order.query.count()
    total_revenue = db.session.query(func.sum(Order.total_price)).scalar() or 0

    pdf.drawString(60, y, f"Total Orders: {total_orders}")
    y -= 30
    pdf.drawString(60, y, f"Total Revenue: ₹ {total_revenue}")

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="revenue_report.pdf",
        mimetype="application/pdf"
    )

# Admin: Generate Sales Report PDF
@app.route('/api/admin/reports/sales/pdf')
def admin_sales_pdf():
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(170, height - 40, "Sales Report")

    pdf.setFont("Helvetica", 12)
    y = height - 100

    # Get all orders
    orders = Order.query.all()
    
    total_sales = 0
    total_items = 0
    
    for order in orders:
        total_sales += order.total_price or 0
        total_items += order.total_qty or 0

    # Get current month sales
    from datetime import datetime, timedelta
    today = datetime.now()
    month_start = today.replace(day=1)
    
    month_orders = Order.query.filter(Order.created_at >= month_start).all()
    month_sales = sum(o.total_price or 0 for o in month_orders)
    month_items = sum(o.total_qty or 0 for o in month_orders)

    # Get today sales
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = Order.query.filter(Order.created_at >= today_start).all()
    today_sales = sum(o.total_price or 0 for o in today_orders)
    today_items = sum(o.total_qty or 0 for o in today_orders)

    pdf.drawString(60, y, f"Total Sales: ₹ {total_sales}")
    y -= 30
    pdf.drawString(60, y, f"Total Items Sold: {total_items}")
    y -= 30
    pdf.drawString(60, y, f"This Month Sales: ₹ {month_sales}")
    y -= 30
    pdf.drawString(60, y, f"This Month Items: {month_items}")
    y -= 30
    pdf.drawString(60, y, f"Today Sales: ₹ {today_sales}")
    y -= 30
    pdf.drawString(60, y, f"Today Items: {today_items}")

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="sales_report.pdf",
        mimetype="application/pdf"
    )

@app.route('/api/admin/reports/customers/pdf')
def admin_customers_pdf():
    # 1ï¸âƒ£ Admin login check
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    # 2ï¸âƒ£ Memory buffer
    buffer = io.BytesIO()

    # 3ï¸âƒ£ Create PDF
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # 4ï¸âƒ£ Title
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(160, height - 40, "Customer Report")

    # 5ï¸âƒ£ Content
    pdf.setFont("Helvetica", 10)
    y = height - 80

    customers = Customer.query.all()

    for c in customers:
        pdf.drawString(40, y, f"ID: {c.id}")
        pdf.drawString(90, y, f"Name: {c.name}")
        pdf.drawString(240, y, f"Email: {c.email}")
        pdf.drawString(420, y, f"Status: {c.status}")
        y -= 20

        if y < 50:
            pdf.showPage()
            y = height - 50

    # 6ï¸âƒ£ Save & return
    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="customer_report.pdf",
        mimetype="application/pdf"
    )

@app.route('/api/admin/reports/products/pdf')
def admin_products_pdf():
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(150, height - 40, "Products Report")

    pdf.setFont("Helvetica", 10)
    y = height - 80

    # Table header
    pdf.drawString(40, y, "ID")
    pdf.drawString(80, y, "Name")
    pdf.drawString(250, y, "Category")
    pdf.drawString(350, y, "Price")
    pdf.drawString(420, y, "Status")
    y -= 20
    pdf.line(40, y, 550, y)
    y -= 10

    products = Product.query.all()

    for p in products:
        category_name = p.category.name if p.category else 'N/A'
        pdf.drawString(40, y, str(p.id))
        pdf.drawString(80, y, p.name[:30])  # Truncate long names
        pdf.drawString(250, y, category_name[:15])
        pdf.drawString(350, y, f"â‚¹{p.price:.2f}")
        pdf.drawString(420, y, p.status or 'active')
        y -= 20

        if y < 50:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = height - 50

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="products_report.pdf",
        mimetype="application/pdf"
    )

@app.route('/api/admin/reports/orders/pdf')
def admin_orders_pdf():
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(150, height - 40, "Orders Report")

    pdf.setFont("Helvetica", 10)
    y = height - 80

    # Table header
    pdf.drawString(40, y, "ID")
    pdf.drawString(80, y, "Customer")
    pdf.drawString(200, y, "Total Qty")
    pdf.drawString(280, y, "Total Price")
    pdf.drawString(380, y, "Status")
    pdf.drawString(460, y, "Date")
    y -= 20
    pdf.line(40, y, 550, y)
    y -= 10

    orders = Order.query.order_by(Order.created_at.desc()).all()

    for o in orders:
        customer_name = o.customer.name if o.customer else 'N/A'
        date_str = o.created_at.strftime('%d/%m/%Y') if o.created_at else 'N/A'
        pdf.drawString(40, y, str(o.id))
        pdf.drawString(80, y, customer_name[:20])
        pdf.drawString(200, y, str(o.total_qty))
        pdf.drawString(280, y, f"â‚¹{o.total_price:.2f}")
        pdf.drawString(380, y, o.status or 'pending')
        pdf.drawString(460, y, date_str)
        y -= 20

        if y < 50:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = height - 50

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="orders_report.pdf",
        mimetype="application/pdf"
    )

@app.route('/api/admin/reports/custom/pdf')
def admin_custom_pdf():
    if not session.get('admin_id'):
        return jsonify({'error': 'Not authorized'}), 401

    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Start date and end date are required'}), 400
        
        # Parse dates
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        # Set end date to end of day
        end = end.replace(hour=23, minute=59, second=59)
        
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(120, height - 40, f"Custom Report ({start_date} to {end_date})")

        pdf.setFont("Helvetica", 10)
        y = height - 80

        # Filter orders by date range
        orders = Order.query.filter(
            Order.created_at >= start,
            Order.created_at <= end
        ).order_by(Order.created_at.desc()).all()

        # Calculate totals
        total_orders = len(orders)
        total_revenue = sum(order.total_price for order in orders)
        total_items = sum(order.total_qty for order in orders)

        # Summary section
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, y, "Summary")
        y -= 20
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Total Orders: {total_orders}")
        y -= 15
        pdf.drawString(40, y, f"Total Items: {total_items}")
        y -= 15
        pdf.drawString(40, y, f"Total Revenue: â‚¹{total_revenue:.2f}")
        y -= 30

        # Table header
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y, "ID")
        pdf.drawString(80, y, "Date")
        pdf.drawString(150, y, "Customer")
        pdf.drawString(250, y, "Items")
        pdf.drawString(300, y, "Amount")
        pdf.drawString(380, y, "Status")
        y -= 15
        pdf.line(40, y, 550, y)
        y -= 10

        # Orders list
        pdf.setFont("Helvetica", 9)
        for o in orders:
            customer_name = o.customer.name if o.customer else 'N/A'
            date_str = o.created_at.strftime('%d/%m/%Y') if o.created_at else 'N/A'
            
            pdf.drawString(40, y, str(o.id))
            pdf.drawString(80, y, date_str)
            pdf.drawString(150, y, customer_name[:20])
            pdf.drawString(250, y, str(o.total_qty))
            pdf.drawString(300, y, f"â‚¹{o.total_price:.2f}")
            pdf.drawString(380, y, o.status or 'pending')
            y -= 18

            if y < 50:
                pdf.showPage()
                pdf.setFont("Helvetica", 9)
                y = height - 50

        pdf.save()
        buffer.seek(0)

        filename = f"custom_report_{start_date}_to_{end_date}.pdf"
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype="application/pdf"
        )
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Ensure contact and payment_method columns exist in orders table
        try:
            # Check if contact column exists
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='orders' AND COLUMN_NAME='contact'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE orders ADD COLUMN contact VARCHAR(15) AFTER address"))
            
            # Check if payment_method column exists
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='orders' AND COLUMN_NAME='payment_method'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cod' AFTER contact"))
            
            # Check if payment_done column exists
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='orders' AND COLUMN_NAME='payment_done'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE orders ADD COLUMN payment_done BOOLEAN DEFAULT FALSE AFTER payment_method"))
            
            # Check if email column exists in feedback table
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='feedback' AND COLUMN_NAME='email'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE feedback ADD COLUMN email VARCHAR(100) AFTER name"))
            
            # Check if subject column exists in feedback table
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='feedback' AND COLUMN_NAME='subject'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE feedback ADD COLUMN subject VARCHAR(200) AFTER contact"))
            
            # Check if image_filenames column exists in return_requests table
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='return_requests' AND COLUMN_NAME='image_filenames'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE return_requests ADD COLUMN image_filenames TEXT AFTER admin_notes"))
            
            # Check if video_filename column exists in return_requests table
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='return_requests' AND COLUMN_NAME='video_filename'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE return_requests ADD COLUMN video_filename VARCHAR(255) AFTER image_filenames"))
            
            # Check if media_files column exists in return_requests table
            result = db.session.execute(text("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='return_requests' AND COLUMN_NAME='media_files'
            """))
            if not result.fetchone():
                db.session.execute(text("ALTER TABLE return_requests ADD COLUMN media_files TEXT AFTER admin_notes"))
            
            db.session.commit()
        except Exception as e:
            print(f"Database migration note: {str(e)}")
        
        # Create default admin if not exists
        admin = Admin.query.filter_by(username='admin').first()
        if not admin:
            hashed_password = generate_password_hash('admin123')
            new_admin = Admin(
                name='Admin',
                username='admin',
                password=hashed_password,
                contact='0000000000'
            ) 
            db.session.add(new_admin)
            db.session.commit()
            print("Default admin created!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
