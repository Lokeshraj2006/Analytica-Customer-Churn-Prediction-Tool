import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { industryAPI } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { Gem, DollarSign, AlertTriangle, BarChart3, Trophy, Target, Flame, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import {
  HiOutlineGlobe, HiOutlineTrendingDown, HiOutlineExclamation,
  HiOutlineChip, HiOutlineSearchCircle, HiOutlineShieldExclamation,
  HiOutlineCheckCircle, HiOutlineLightningBolt, HiOutlineChartBar,
  HiOutlineViewGrid, HiOutlineCreditCard, HiOutlineUserGroup,
  HiOutlineOfficeBuilding, HiOutlineShoppingCart, HiOutlineHeart,
  HiOutlineDocumentReport, HiOutlineAdjustments, HiOutlineCash,
  HiOutlineCalendar, HiOutlineMail, HiOutlineClipboardList,
} from 'react-icons/hi';

const C = {
  violet: '#8b5cf6', rose: '#f43f5e', emerald: '#10b981', amber: '#f59e0b',
  cyan: '#06b6d4', slate: '#64748b', indigo: '#6366f1', pink: '#ec4899',
};

const CURRENCY_KEYS = [
  'monthly_charges', 'total_charges', 'balance', 'estimated_salary', 'avg_order_value',
  'monthly_income', 'annual_income', 'lifetime_spending', 'outstanding_bills', 'copayment_amount', 'avg_tx_value'
];

// ── Industry icon components (no emojis) ──────────────────────────────────────
const IndustryIcon = ({ industry, size = 28, color }) => {
  const s = { fontSize: size, color: color || '#e2e8f0' };
  switch (industry) {
    case 'telecom': return <HiOutlineGlobe style={s} />;
    case 'banking': return <HiOutlineOfficeBuilding style={s} />;
    case 'ecommerce': return <HiOutlineShoppingCart style={s} />;
    case 'healthcare': return <HiOutlineHeart style={s} />;
    default: return <HiOutlineGlobe style={s} />;
  }
};

const INDUSTRIES = [
  {
    key: 'telecom', label: 'Telecom', color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    description: 'ISP & mobile carrier churn prediction',
    avgChurn: '26.5%', topRisk: 'Month-to-month contracts',
  },
  {
    key: 'banking', label: 'Banking', color: '#10b981',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    description: 'Retail banking & account holder retention',
    avgChurn: '20.4%', topRisk: 'Inactive member status',
  },
  {
    key: 'ecommerce', label: 'E-commerce', color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    description: 'Online retail & subscription churn',
    avgChurn: '22.1%', topRisk: 'High cart abandonment rate',
  },
  {
    key: 'healthcare', label: 'Healthcare', color: '#f43f5e',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
    description: 'Patient retention & appointment adherence',
    avgChurn: '18.7%', topRisk: 'Appointment no-shows',
  },
];

const STATIC_DEFAULTS = {
  banking: {
    age: 38, gender: 'Male', geography: 'France', marital_status: 'Single', occupation: 'Salaried', annual_income: 60000,
    tenure: 3, account_type: 'Savings', num_accounts: 2, has_credit_card: 'Yes', is_active_member: 'Yes',
    credit_score: 720, balance: 350000, estimated_salary: 72000, monthly_income: 5000, avg_monthly_tx: 25, avg_tx_value: 150,
    num_products: 2, mobile_banking_usage: 'Medium', internet_banking_usage: 'Medium', atm_usage_frequency: 'Weekly',
    days_since_last_login: 4, complaints_last_year: 0, customer_support_calls: 1, loan_status: 'No Loan', emi_delay_count: 0
  },
  telecom: {
    age: 42, gender: 'Male', region: 'North', contract: 'Month-to-month',
    tenure: 12, monthly_charges: 70.00, total_charges: 840.00, payment_method: 'Electronic check', paperless_billing: 'Yes',
    internet_service: 'Fiber optic', phone_service: 'Yes', multiple_lines: 'No', streaming_tv: 'No', streaming_movies: 'No', device_protection: 'No', online_security: 'No', tech_support: 'No',
    monthly_data_usage: 28, voice_minutes: 450, sms_usage: 120, international_calls: 15, roaming_usage: 'None',
    customer_service_calls: 1, num_complaints: 0, missed_payments: 0, contract_renewal_status: 'Auto-renew', days_since_last_recharge: 10, payment_delay_count: 0
  },
  ecommerce: {
    age: 34, gender: 'Female', location: 'Urban', loyalty_tier: 'Silver',
    days_since_last_purchase: 45, total_orders: 18, avg_order_value: 68.50, lifetime_spending: 1230.00, products_purchased: 35,
    cart_abandonment_rate: 42, wishlist_items: 5, browsing_sessions: 24, avg_session_duration: 18, product_views: 120,
    email_opens_rate: 28.5, push_notification_click_rate: 15.2, coupon_usage: 'Occasional', loyalty_points: 1250, referral_count: 1,
    returns_count: 2, refund_count: 1, complaints: 0, support_tickets: 2, avg_review_rating: 4.2,
    subscription_type: 'Free', subscription_age_months: 14, auto_renewal: 'Yes'
  },
  healthcare: {
    age: 45, gender: 'Female', insurance_type: 'Private', payment_type: 'Insurance',
    days_since_last_visit: 90, num_visits: 4, missed_appointments: 1, cancellation_count: 2,
    chronic_conditions: 1, risk_category: 'Low', prescription_count: 2, specialists_visited: 1,
    telemedicine_usage: 'Occasional', patient_portal_login: 'Monthly', health_app_usage: 'Inactive User', reminder_response_rate: 85,
    patient_satisfaction: 8, complaints: 0, waiting_time: 25, doctor_rating: 4.5,
    outstanding_bills: 150, claims_rejected: 0, copayment_amount: 30
  }
};

const TEMPLATES = {
  banking: {
    high_risk: {
      age: 52, gender: 'Female', geography: 'Germany', marital_status: 'Single', occupation: 'Unemployed', annual_income: 18000,
      tenure: 1, account_type: 'Checking', num_accounts: 3, has_credit_card: 'No', is_active_member: 'No',
      credit_score: 420, balance: 120000, estimated_salary: 48000, monthly_income: 1500, avg_monthly_tx: 5, avg_tx_value: 20,
      num_products: 1, mobile_banking_usage: 'Low', internet_banking_usage: 'Low', atm_usage_frequency: 'Rarely',
      days_since_last_login: 45, complaints_last_year: 4, customer_support_calls: 8, loan_status: 'Defaulted', emi_delay_count: 5
    },
    medium_risk: {
      age: 40, gender: 'Male', geography: 'Spain', marital_status: 'Married', occupation: 'Self-employed', annual_income: 45000,
      tenure: 4, account_type: 'Savings', num_accounts: 2, has_credit_card: 'Yes', is_active_member: 'No',
      credit_score: 590, balance: 80000, estimated_salary: 65000, monthly_income: 3800, avg_monthly_tx: 15, avg_tx_value: 80,
      num_products: 2, mobile_banking_usage: 'Medium', internet_banking_usage: 'Medium', atm_usage_frequency: 'Weekly',
      days_since_last_login: 15, complaints_last_year: 1, customer_support_calls: 3, loan_status: 'Active Loan', emi_delay_count: 1
    },
    low_risk: {
      age: 30, gender: 'Female', geography: 'France', marital_status: 'Married', occupation: 'Salaried', annual_income: 95000,
      tenure: 8, account_type: 'Savings', num_accounts: 1, has_credit_card: 'Yes', is_active_member: 'Yes',
      credit_score: 750, balance: 30000, estimated_salary: 95000, monthly_income: 8000, avg_monthly_tx: 45, avg_tx_value: 300,
      num_products: 2, mobile_banking_usage: 'High', internet_banking_usage: 'High', atm_usage_frequency: 'Weekly',
      days_since_last_login: 2, complaints_last_year: 0, customer_support_calls: 0, loan_status: 'No Loan', emi_delay_count: 0
    }
  },
  telecom: {
    high_risk: {
      age: 68, gender: 'Male', region: 'South', contract: 'Month-to-month',
      tenure: 2, monthly_charges: 95.80, total_charges: 191.60, payment_method: 'Electronic check', paperless_billing: 'Yes',
      internet_service: 'Fiber optic', phone_service: 'Yes', multiple_lines: 'Yes', streaming_tv: 'Yes', streaming_movies: 'Yes', device_protection: 'No', online_security: 'No', tech_support: 'No',
      monthly_data_usage: 120, voice_minutes: 1800, sms_usage: 800, international_calls: 0, roaming_usage: 'Domestic',
      customer_service_calls: 6, num_complaints: 3, missed_payments: 2, contract_renewal_status: 'Pending', days_since_last_recharge: 45, payment_delay_count: 3
    },
    medium_risk: {
      age: 45, gender: 'Female', region: 'East', contract: 'One year',
      tenure: 18, monthly_charges: 59.90, total_charges: 1078.20, payment_method: 'Mailed check', paperless_billing: 'No',
      internet_service: 'DSL', phone_service: 'Yes', multiple_lines: 'No', streaming_tv: 'No', streaming_movies: 'No', device_protection: 'Yes', online_security: 'No', tech_support: 'Yes',
      monthly_data_usage: 15, voice_minutes: 600, sms_usage: 100, international_calls: 5, roaming_usage: 'None',
      customer_service_calls: 2, num_complaints: 1, missed_payments: 0, contract_renewal_status: 'Renewed', days_since_last_recharge: 12, payment_delay_count: 0
    },
    low_risk: {
      age: 35, gender: 'Female', region: 'North', contract: 'Two year',
      tenure: 48, monthly_charges: 45.50, total_charges: 2184.00, payment_method: 'Credit card (automatic)', paperless_billing: 'No',
      internet_service: 'DSL', phone_service: 'Yes', multiple_lines: 'No', streaming_tv: 'No', streaming_movies: 'No', device_protection: 'Yes', online_security: 'Yes', tech_support: 'Yes',
      monthly_data_usage: 5, voice_minutes: 300, sms_usage: 50, international_calls: 2, roaming_usage: 'None',
      customer_service_calls: 0, num_complaints: 0, missed_payments: 0, contract_renewal_status: 'Renewed', days_since_last_recharge: 3, payment_delay_count: 0
    }
  },
  ecommerce: {
    high_risk: {
      age: 22, gender: 'Male', location: 'Rural', loyalty_tier: 'Bronze',
      days_since_last_purchase: 180, total_orders: 2, avg_order_value: 15.00, lifetime_spending: 30.00, products_purchased: 4,
      cart_abandonment_rate: 85, wishlist_items: 2, browsing_sessions: 6, avg_session_duration: 3, product_views: 12,
      email_opens_rate: 5, push_notification_click_rate: 2, coupon_usage: 'Never', loyalty_points: 50, referral_count: 0,
      returns_count: 8, refund_count: 5, complaints: 4, support_tickets: 9, avg_review_rating: 1.5,
      subscription_type: 'Free', subscription_age_months: 2, auto_renewal: 'No'
    },
    medium_risk: {
      age: 38, gender: 'Female', location: 'Suburban', loyalty_tier: 'Silver',
      days_since_last_purchase: 60, total_orders: 12, avg_order_value: 52.00, lifetime_spending: 624.00, products_purchased: 20,
      cart_abandonment_rate: 55, wishlist_items: 6, browsing_sessions: 18, avg_session_duration: 12, product_views: 65,
      email_opens_rate: 22, push_notification_click_rate: 10, coupon_usage: 'Occasional', loyalty_points: 450, referral_count: 1,
      returns_count: 2, refund_count: 1, complaints: 1, support_tickets: 3, avg_review_rating: 3.8,
      subscription_type: 'Monthly Pass', subscription_age_months: 10, auto_renewal: 'Yes'
    },
    low_risk: {
      age: 29, gender: 'Female', location: 'Urban', loyalty_tier: 'Platinum',
      days_since_last_purchase: 5, total_orders: 85, avg_order_value: 110.00, lifetime_spending: 9350.00, products_purchased: 180,
      cart_abandonment_rate: 15, wishlist_items: 12, browsing_sessions: 48, avg_session_duration: 25, product_views: 450,
      email_opens_rate: 65, push_notification_click_rate: 32, coupon_usage: 'Frequent', loyalty_points: 12500, referral_count: 4,
      returns_count: 0, refund_count: 0, complaints: 0, support_tickets: 0, avg_review_rating: 4.8,
      subscription_type: 'Annual Membership', subscription_age_months: 24, auto_renewal: 'Yes'
    }
  },
  healthcare: {
    high_risk: {
      age: 28, gender: 'Male', insurance_type: 'None', payment_type: 'Self-pay',
      days_since_last_visit: 400, num_visits: 1, missed_appointments: 8, cancellation_count: 6,
      chronic_conditions: 0, risk_category: 'High', prescription_count: 0, specialists_visited: 0,
      telemedicine_usage: 'Never', patient_portal_login: 'Never', health_app_usage: 'Not Registered', reminder_response_rate: 12,
      patient_satisfaction: 3, complaints: 3, waiting_time: 75, doctor_rating: 2.1,
      outstanding_bills: 950, claims_rejected: 4, copayment_amount: 100
    },
    medium_risk: {
      age: 52, gender: 'Female', insurance_type: 'Medicare', payment_type: 'Insurance',
      days_since_last_visit: 150, num_visits: 5, missed_appointments: 3, cancellation_count: 2,
      chronic_conditions: 2, risk_category: 'Medium', prescription_count: 3, specialists_visited: 2,
      telemedicine_usage: 'Occasional', patient_portal_login: 'Monthly', health_app_usage: 'Inactive User', reminder_response_rate: 55,
      patient_satisfaction: 6, complaints: 1, waiting_time: 35, doctor_rating: 3.8,
      outstanding_bills: 240, claims_rejected: 1, copayment_amount: 40
    },
    low_risk: {
      age: 65, gender: 'Female', insurance_type: 'Private', payment_type: 'Insurance',
      days_since_last_visit: 15, num_visits: 12, missed_appointments: 0, cancellation_count: 0,
      chronic_conditions: 4, risk_category: 'Low', prescription_count: 6, specialists_visited: 3,
      telemedicine_usage: 'Frequent', patient_portal_login: 'Weekly', health_app_usage: 'Active User', reminder_response_rate: 92,
      patient_satisfaction: 9, complaints: 0, waiting_time: 15, doctor_rating: 4.8,
      outstanding_bills: 0, claims_rejected: 0, copayment_amount: 15
    }
  }
};

const SECTION_ICONS = {
  // Telecom
  'Customer Information': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Billing Information': <HiOutlineCreditCard style={{ fontSize: 16 }} />,
  'Subscription Details': <HiOutlineGlobe style={{ fontSize: 16 }} />,
  'Usage Statistics': <HiOutlineChartBar style={{ fontSize: 16 }} />,
  'Customer Behaviour': <HiOutlineChartBar style={{ fontSize: 16 }} />,

  // Banking
  'Customer Profile': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Relationship Details': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Financial Details': <HiOutlineCash style={{ fontSize: 16 }} />,
  'Product Usage': <HiOutlineChartBar style={{ fontSize: 16 }} />,

  // E-commerce
  'Purchase Behaviour': <HiOutlineShoppingCart style={{ fontSize: 16 }} />,
  'Shopping Behaviour': <HiOutlineShoppingCart style={{ fontSize: 16 }} />,
  'Customer Engagement': <HiOutlineMail style={{ fontSize: 16 }} />,
  'Support & Returns': <HiOutlineDocumentReport style={{ fontSize: 16 }} />,
  'Subscription': <HiOutlineCalendar style={{ fontSize: 16 }} />,

  // Healthcare
  'Patient Profile': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Appointment History': <HiOutlineCalendar style={{ fontSize: 16 }} />,
  'Clinical Information': <HiOutlineHeart style={{ fontSize: 16 }} />,
  'Patient Engagement': <HiOutlineMail style={{ fontSize: 16 }} />,
  'Satisfaction Metrics': <HiOutlineHeart style={{ fontSize: 16 }} />,
  'Billing & Insurance': <HiOutlineCreditCard style={{ fontSize: 16 }} />,
};

const FIELD_SCHEMAS = {
  banking: [
    { section: 'Customer Profile', fields: [
      { key: 'age', label: 'Age', type: 'slider', min: 18, max: 95 },
      { key: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female'] },
      { key: 'geography', label: 'Geography', type: 'radio', options: ['France', 'Germany', 'Spain'] },
      { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced'] },
      { key: 'occupation', label: 'Occupation', type: 'select', options: ['Salaried', 'Self-employed', 'Retired', 'Student', 'Unemployed'] },
      { key: 'annual_income', label: 'Annual Income ($)', type: 'number', min: 0, max: 1000000 }
    ]},
    { section: 'Relationship Details', fields: [
      { key: 'tenure', label: 'Customer Tenure (Years)', type: 'number', min: 0, max: 30 },
      { key: 'account_type', label: 'Account Type', type: 'select', options: ['Savings', 'Checking', 'Money Market', 'Certificate of Deposit'] },
      { key: 'num_accounts', label: 'Number of Accounts', type: 'number', min: 1, max: 5 },
      { key: 'has_credit_card', label: 'Has Credit Card', type: 'toggle', options: ['Yes', 'No'] },
      { key: 'is_active_member', label: 'Active Member', type: 'toggle', options: ['Yes', 'No'] }
    ]},
    { section: 'Financial Details', fields: [
      { key: 'credit_score', label: 'Credit Score', type: 'number', min: 300, max: 900 },
      { key: 'balance', label: 'Account Balance ($)', type: 'number', min: 0, max: 1000000 },
      { key: 'estimated_salary', label: 'Estimated Salary ($)', type: 'number', min: 0, max: 1000000 },
      { key: 'monthly_income', label: 'Monthly Income ($)', type: 'number', min: 0, max: 100000 },
      { key: 'avg_monthly_tx', label: 'Average Monthly Transactions', type: 'number', min: 0, max: 200 },
      { key: 'avg_tx_value', label: 'Average Transaction Value ($)', type: 'number', min: 0, max: 10000 }
    ]},
    { section: 'Product Usage', fields: [
      { key: 'num_products', label: 'Number of Products', type: 'number', min: 1, max: 5 },
      { key: 'mobile_banking_usage', label: 'Mobile Banking Usage', type: 'radio', options: ['High', 'Medium', 'Low'] },
      { key: 'internet_banking_usage', label: 'Internet Banking Usage', type: 'radio', options: ['High', 'Medium', 'Low'] },
      { key: 'atm_usage_frequency', label: 'ATM Usage Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] }
    ]},
    { section: 'Customer Behaviour', fields: [
      { key: 'days_since_last_login', label: 'Days Since Last Login', type: 'number', min: 0, max: 365 },
      { key: 'complaints_last_year', label: 'Complaints Last Year', type: 'number', min: 0, max: 10 },
      { key: 'customer_support_calls', label: 'Customer Support Calls', type: 'number', min: 0, max: 20 },
      { key: 'loan_status', label: 'Loan Status', type: 'select', options: ['No Loan', 'Active Loan', 'Defaulted'] },
      { key: 'emi_delay_count', label: 'EMI Payment Delay Count', type: 'number', min: 0, max: 12 }
    ]}
  ],
  telecom: [
    { section: 'Customer Information', fields: [
      { key: 'age', label: 'Age', type: 'slider', min: 18, max: 100 },
      { key: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female'] },
      { key: 'region', label: 'Region', type: 'radio', options: ['North', 'South', 'East', 'West'] },
      { key: 'contract', label: 'Contract Type', type: 'select', options: ['Month-to-month', 'One year', 'Two year'] }
    ]},
    { section: 'Billing Information', fields: [
      { key: 'tenure', label: 'Customer Tenure (Months)', type: 'number', min: 0, max: 72 },
      { key: 'monthly_charges', label: 'Monthly Charges ($)', type: 'number', min: 0, max: 250 },
      { key: 'total_charges', label: 'Total Charges ($)', type: 'number', min: 0, max: 15000 },
      { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'] },
      { key: 'paperless_billing', label: 'Paperless Billing', type: 'toggle', options: ['Yes', 'No'] }
    ]},
    { section: 'Subscription Details', fields: [
      { key: 'internet_service', label: 'Internet Service', type: 'select', options: ['DSL', 'Fiber optic', 'No'] },
      { key: 'phone_service', label: 'Phone Service', type: 'toggle', options: ['Yes', 'No'] },
      { key: 'multiple_lines', label: 'Multiple Lines', type: 'select', options: ['Yes', 'No', 'No phone service'] },
      { key: 'streaming_tv', label: 'Streaming TV', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'streaming_movies', label: 'Streaming Movies', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'device_protection', label: 'Device Protection', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'online_security', label: 'Online Security', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'tech_support', label: 'Tech Support', type: 'select', options: ['Yes', 'No', 'No internet service'] }
    ]},
    { section: 'Usage Statistics', fields: [
      { key: 'monthly_data_usage', label: 'Monthly Data Usage (GB)', type: 'number', min: 0, max: 1000 },
      { key: 'voice_minutes', label: 'Voice Minutes', type: 'number', min: 0, max: 5000 },
      { key: 'sms_usage', label: 'SMS Usage', type: 'number', min: 0, max: 2000 },
      { key: 'international_calls', label: 'International Calls', type: 'number', min: 0, max: 500 },
      { key: 'roaming_usage', label: 'Roaming Usage', type: 'select', options: ['None', 'Domestic', 'International'] }
    ]},
    { section: 'Customer Behaviour', fields: [
      { key: 'customer_service_calls', label: 'Customer Service Calls', type: 'number', min: 0, max: 20 },
      { key: 'num_complaints', label: 'Number of Complaints', type: 'number', min: 0, max: 10 },
      { key: 'missed_payments', label: 'Missed Payments', type: 'number', min: 0, max: 12 },
      { key: 'contract_renewal_status', label: 'Contract Renewal Status', type: 'select', options: ['Renewed', 'Pending', 'Auto-renew'] },
      { key: 'days_since_last_recharge', label: 'Days Since Last Recharge', type: 'number', min: 0, max: 180 },
      { key: 'payment_delay_count', label: 'Payment Delay Count', type: 'number', min: 0, max: 12 }
    ]}
  ],
  ecommerce: [
    { section: 'Customer Profile', fields: [
      { key: 'age', label: 'Age', type: 'slider', min: 18, max: 90 },
      { key: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female'] },
      { key: 'location', label: 'Location', type: 'radio', options: ['Urban', 'Suburban', 'Rural'] },
      { key: 'loyalty_tier', label: 'Membership Tier', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'] }
    ]},
    { section: 'Purchase Behaviour', fields: [
      { key: 'days_since_last_purchase', label: 'Days Since Last Purchase', type: 'number', min: 0, max: 365 },
      { key: 'total_orders', label: 'Total Orders', type: 'number', min: 1, max: 500 },
      { key: 'avg_order_value', label: 'Average Order Value ($)', type: 'number', min: 0, max: 5000 },
      { key: 'lifetime_spending', label: 'Lifetime Spending ($)', type: 'number', min: 0, max: 100000 },
      { key: 'products_purchased', label: 'Products Purchased', type: 'number', min: 1, max: 2000 }
    ]},
    { section: 'Shopping Behaviour', fields: [
      { key: 'cart_abandonment_rate', label: 'Cart Abandonment Rate (%)', type: 'slider', min: 0, max: 100 },
      { key: 'wishlist_items', label: 'Wishlist Items', type: 'number', min: 0, max: 100 },
      { key: 'browsing_sessions', label: 'Browsing Sessions', type: 'number', min: 0, max: 100 },
      { key: 'avg_session_duration', label: 'Average Session Duration (Minutes)', type: 'number', min: 0, max: 120 },
      { key: 'product_views', label: 'Product Views', type: 'number', min: 0, max: 1000 }
    ]},
    { section: 'Customer Engagement', fields: [
      { key: 'email_opens_rate', label: 'Email Open Rate (%)', type: 'slider', min: 0, max: 100 },
      { key: 'push_notification_click_rate', label: 'Push Notification Click Rate (%)', type: 'slider', min: 0, max: 100 },
      { key: 'coupon_usage', label: 'Coupon Usage', type: 'select', options: ['Frequent', 'Occasional', 'Never'] },
      { key: 'loyalty_points', label: 'Loyalty Points', type: 'number', min: 0, max: 50000 },
      { key: 'referral_count', label: 'Referral Count', type: 'number', min: 0, max: 50 }
    ]},
    { section: 'Support & Returns', fields: [
      { key: 'returns_count', label: 'Return Count', type: 'number', min: 0, max: 50 },
      { key: 'refund_count', label: 'Refund Count', type: 'number', min: 0, max: 50 },
      { key: 'complaints', label: 'Complaints', type: 'number', min: 0, max: 10 },
      { key: 'support_tickets', label: 'Support Tickets', type: 'number', min: 0, max: 25 },
      { key: 'avg_review_rating', label: 'Average Review Rating', type: 'number', min: 1, max: 5, step: 0.1 }
    ]},
    { section: 'Subscription', fields: [
      { key: 'subscription_type', label: 'Subscription Type', type: 'select', options: ['Free', 'Monthly Pass', 'Annual Membership'] },
      { key: 'subscription_age_months', label: 'Subscription Age (Months)', type: 'number', min: 0, max: 120 },
      { key: 'auto_renewal', label: 'Auto Renewal', type: 'toggle', options: ['Yes', 'No'] }
    ]}
  ],
  healthcare: [
    { section: 'Patient Profile', fields: [
      { key: 'age', label: 'Age', type: 'slider', min: 0, max: 120 },
      { key: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female', 'Other'] },
      { key: 'insurance_type', label: 'Insurance Type', type: 'select', options: ['Private', 'Medicare', 'Medicaid', 'None'] },
      { key: 'payment_type', label: 'Payment Type', type: 'select', options: ['Insurance', 'Self-pay', 'Government assistance'] }
    ]},
    { section: 'Appointment History', fields: [
      { key: 'days_since_last_visit', label: 'Days Since Last Visit', type: 'number', min: 0, max: 730 },
      { key: 'num_visits', label: 'Number of Visits', type: 'number', min: 1, max: 100 },
      { key: 'missed_appointments', label: 'Missed Appointments', type: 'number', min: 0, max: 50 },
      { key: 'cancellation_count', label: 'Appointment Cancellation Count', type: 'number', min: 0, max: 50 }
    ]},
    { section: 'Clinical Information', fields: [
      { key: 'chronic_conditions', label: 'Chronic Conditions', type: 'number', min: 0, max: 10 },
      { key: 'risk_category', label: 'Risk Category', type: 'radio', options: ['Low', 'Medium', 'High'] },
      { key: 'prescription_count', label: 'Active Prescriptions', type: 'number', min: 0, max: 30 },
      { key: 'specialists_visited', label: 'Number of Specialists Visited', type: 'number', min: 0, max: 15 }
    ]},
    { section: 'Patient Engagement', fields: [
      { key: 'telemedicine_usage', label: 'Telemedicine Usage', type: 'select', options: ['Frequent', 'Occasional', 'Never'] },
      { key: 'patient_portal_login', label: 'Patient Portal Login Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Never'] },
      { key: 'health_app_usage', label: 'Health App Usage', type: 'select', options: ['Active User', 'Inactive User', 'Not Registered'] },
      { key: 'reminder_response_rate', label: 'Reminder Response Rate (%)', type: 'slider', min: 0, max: 100 }
    ]},
    { section: 'Satisfaction Metrics', fields: [
      { key: 'patient_satisfaction', label: 'Patient Satisfaction Score (1–10)', type: 'slider', min: 1, max: 10 },
      { key: 'complaints', label: 'Complaints', type: 'number', min: 0, max: 10 },
      { key: 'waiting_time', label: 'Average Waiting Time (Minutes)', type: 'number', min: 0, max: 180 },
      { key: 'doctor_rating', label: 'Doctor Rating', type: 'slider', min: 1, max: 5, step: 0.1 }
    ]},
    { section: 'Billing & Insurance', fields: [
      { key: 'outstanding_bills', label: 'Outstanding Bills ($)', type: 'number', min: 0, max: 50000 },
      { key: 'claims_rejected', label: 'Claims Rejected', type: 'number', min: 0, max: 20 },
      { key: 'copayment_amount', label: 'Copayment Amount ($)', type: 'number', min: 0, max: 2000 }
    ]}
  ]
};

const BENCHMARK = [
  { industry: 'Telecom', avg_churn_rate: 26.5, color: '#6366f1' },
  { industry: 'Banking', avg_churn_rate: 20.4, color: '#10b981' },
  { industry: 'E-commerce', avg_churn_rate: 22.1, color: '#f59e0b' },
  { industry: 'Healthcare', avg_churn_rate: 18.7, color: '#f43f5e' },
];

/* ── Helper components ─────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  return (
    <div className="glass-card animate-fade-in-up" style={{ animationDelay: `${delay}ms`, padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color }}>
          {icon}
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>{label}</div>
          <div style={{ color, fontSize: '1.35rem', fontWeight: 800 }}>{value}</div>
          {sub && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: d.color, fontWeight: 700, margin: '0 0 4px' }}>{d.industry}</p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>Avg Churn Rate: <strong style={{ color: C.rose }}>{d.avg_churn_rate}%</strong></p>
    </div>
  );
}

function FactorBar({ factor, maxImportance }) {
  const pct = maxImportance > 0 ? (factor.importance / maxImportance) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ width: 180, color: '#cbd5e1', fontSize: '0.8rem', flexShrink: 0 }}>{factor.feature}</span>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 6, transition: 'width 0.6s ease', boxShadow: '0 0 6px rgba(139,92,246,0.5)' }} />
      </div>
      <span style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700, width: 44, textAlign: 'right' }}>{(factor.importance * 100).toFixed(1)}%</span>
    </div>
  );
}

const ALL_MODELS = [
  { key: 'random_forest', name: 'Random Forest', icon: '◈', color: '#667eea', desc: 'Ensemble of decision trees' },
  { key: 'xgboost', name: 'XGBoost', icon: '✦', color: '#4facfe', desc: 'Gradient boosted trees' },
  { key: 'gradient_boosting', name: 'Gradient Boosting', icon: '◎', color: '#f093fb', desc: 'Sequential boosting' },
  { key: 'logistic_regression', name: 'Logistic Regression', icon: '∿', color: '#00e676', desc: 'Linear model' },
  { key: 'decision_tree', name: 'Decision Tree', icon: '⬡', color: '#ff9800', desc: 'Single tree' },
  { key: 'svm', name: 'SVM', icon: '◌', color: '#ff6b6b', desc: 'Support vectors' },
  { key: 'knn', name: 'KNN', icon: '⊕', color: '#a78bfa', desc: 'K-nearest neighbors' },
];

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function MultiIndustry({ onPredictionContext }) {
  const { currency, currentCurrency, currencies, convertToUSD, convertFromUSD, format } = useCurrency();
  const [selectedIndustry, setSelectedIndustry] = useState('telecom');
  const [modelType, setModelType] = useState('random_forest');
  // Lazily initialize form state to convert defaults to active currency on first render
  const [form, setForm] = useState(() => {
    const base = { ...STATIC_DEFAULTS.telecom };
    const rate = currencies[currency]?.rate || 1.0;
    if (rate !== 1.0) {
      CURRENCY_KEYS.forEach(k => {
        if (base[k] !== undefined) {
          base[k] = parseFloat((base[k] * rate).toFixed(2));
        }
      });
    }
    return base;
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [benchmarkData, setBenchmarkData] = useState(BENCHMARK);
  const [activeTab, setActiveTab] = useState('form');
  const [prevCurrency, setPrevCurrency] = useState(currency);
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    industryAPI.getBenchmark()
      .then(r => { if (r.data?.benchmark) setBenchmarkData(r.data.benchmark); })
      .catch(() => {});
  }, []);

  // Currency transition hook
  useEffect(() => {
    if (currency !== prevCurrency) {
      setForm(prev => {
        const oldRate = currencies[prevCurrency].rate;
        const newRate = currencies[currency].rate;
        const converted = { ...prev };

        CURRENCY_KEYS.forEach(k => {
          if (converted[k] !== undefined) {
            converted[k] = parseFloat((converted[k] / oldRate * newRate).toFixed(2));
          }
        });
        return converted;
      });
      setPrevCurrency(currency);
    }
  }, [currency, prevCurrency, currencies]);

  const handleIndustryChange = (key) => {
    setSelectedIndustry(key);
    const base = { ...STATIC_DEFAULTS[key] };

    CURRENCY_KEYS.forEach(k => {
      if (base[k] !== undefined) {
        base[k] = parseFloat((base[k] * currentCurrency.rate).toFixed(2));
      }
    });
    setForm(base);
    setResult(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const parsedVal = type === 'number' || type === 'range' ? (parseFloat(value) ?? 0) : value;

    // Reset active template selection since user has manually customized the form values
    setSelectedTemplate('');

    // Find field in current schema to validate limits
    const currentSchema = FIELD_SCHEMAS[selectedIndustry] || [];
    let fieldObj = null;
    for (const sec of currentSchema) {
      const f = sec.fields.find(field => field.key === name);
      if (f) { fieldObj = f; break; }
    }

    if (fieldObj && (type === 'number' || type === 'range')) {
      const num = parseFloat(value);
      if (isNaN(num)) {
        setValidationErrors(prev => ({ ...prev, [name]: 'Must be a valid number' }));
      } else {
        // Scale min/max limits if the field represents a currency amount
        const isCurrency = CURRENCY_KEYS.includes(name);
        const minLimit = fieldObj.min !== undefined ? (isCurrency ? parseFloat((fieldObj.min * currentCurrency.rate).toFixed(2)) : fieldObj.min) : undefined;
        const maxLimit = fieldObj.max !== undefined ? (isCurrency ? parseFloat((fieldObj.max * currentCurrency.rate).toFixed(2)) : fieldObj.max) : undefined;

        if (minLimit !== undefined && num < minLimit) {
          const formattedMin = isCurrency ? `${currentCurrency.symbol}${minLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : minLimit;
          setValidationErrors(prev => ({ ...prev, [name]: `${fieldObj.label} must be >= ${formattedMin}` }));
        } else if (maxLimit !== undefined && num > maxLimit) {
          const formattedMax = isCurrency ? `${currentCurrency.symbol}${maxLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : maxLimit;
          setValidationErrors(prev => ({ ...prev, [name]: `${fieldObj.label} must be <= ${formattedMax}` }));
        } else {
          setValidationErrors(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
          });
        }
      }
    } else {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    setForm(prev => ({
      ...prev,
      [name]: parsedVal,
    }));
  };

  const applyTemplate = (templateKey) => {
    const tpl = TEMPLATES[selectedIndustry]?.[templateKey];
    if (tpl) {
      const base = { ...tpl };
  
      CURRENCY_KEYS.forEach(k => {
        if (base[k] !== undefined) {
          base[k] = parseFloat((base[k] * currentCurrency.rate).toFixed(2));
        }
      });
      setForm(base);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // Convert currency values back to USD before sending to backend API
      const convertedForm = { ...form };
  
      CURRENCY_KEYS.forEach(k => {
        if (convertedForm[k] !== undefined) {
          convertedForm[k] = convertToUSD(convertedForm[k]);
        }
      });

      // Convert specific keys to integer 1/0 for backend compatibility
      const binaryIntKeys = ['has_credit_card', 'is_active_member'];
      binaryIntKeys.forEach(k => {
        if (convertedForm[k] !== undefined) {
          convertedForm[k] = convertedForm[k] === 'Yes' ? 1 : 0;
        }
      });

      const res = await industryAPI.predict(selectedIndustry, convertedForm, modelType);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const schema = FIELD_SCHEMAS[selectedIndustry] || [];
  const industry = INDUSTRIES.find(i => i.key === selectedIndustry);

  const riskColor = result
    ? result.risk_level === 'High' ? C.rose
      : result.risk_level === 'Medium' ? C.amber
      : C.emerald
    : C.slate;

  const maxImportance = result?.contributing_factors?.[0]?.importance || 1;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 12, padding: '6px 10px', display: 'flex' }}>
            <HiOutlineLightningBolt style={{ fontSize: '1.1rem', color: '#a78bfa' }} />
          </span>
          Churn Prediction Suite
        </h1>
        <p>Predict customer churn across Telecom, Banking, E-commerce & Healthcare verticals</p>
      </div>

      {/* Industry Selector */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Select Industry Vertical
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {INDUSTRIES.map((ind, idx) => {
            const isActive = selectedIndustry === ind.key;
            return (
              <div
                key={ind.key}
                onClick={() => handleIndustryChange(ind.key)}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${idx * 60}ms`,
                  padding: '20px 16px', borderRadius: 16, cursor: 'pointer',
                  border: `1.5px solid ${isActive ? ind.color : 'rgba(255,255,255,0.08)'}`,
                  background: isActive ? `${ind.color}12` : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.22s ease', position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = `${ind.color}60`; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ind.gradient, borderRadius: '16px 16px 0 0' }} />
                )}
                <div style={{ marginBottom: 10 }}>
                  <IndustryIcon industry={ind.key} size={32} color={isActive ? ind.color : '#94a3b8'} />
                </div>
                <div style={{ color: isActive ? ind.color : '#e2e8f0', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{ind.label}</div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', lineHeight: 1.4, marginBottom: 8 }}>{ind.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Avg churn:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: ind.color }}>{ind.avgChurn}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<IndustryIcon industry={selectedIndustry} size={22} color={industry?.color} />} label="Selected Industry" value={industry?.label} sub={industry?.description} color={industry?.color} delay={0} />
        <StatCard icon={<HiOutlineTrendingDown />} label="Industry Avg Churn" value={industry?.avgChurn} sub="Annual average" color={C.rose} delay={50} />
        <StatCard icon={<HiOutlineExclamation />} label="Top Risk Factor" value={industry?.topRisk} color={C.amber} delay={100} />
        <StatCard icon={<HiOutlineChip />} label="Active Model" value={ALL_MODELS.find(m => m.key === modelType)?.name} sub="Selected ML model" color={C.violet} delay={150} />
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'form', label: 'Predict', Icon: HiOutlineClipboardList },
          { key: 'benchmark', label: 'Benchmark', Icon: HiOutlineChartBar },
          { key: 'insights', label: 'Industry Insights', Icon: HiOutlineDocumentReport },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#a78bfa' : '#64748b',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.85rem', transition: 'all 0.2s',
              borderBottom: activeTab === tab.key ? '2px solid #8b5cf6' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <tab.Icon style={{ fontSize: '1rem' }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: PREDICT ═══ */}
      {activeTab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 360px' : '1fr', gap: 24 }}>
          <div>
            {/* Model Selector */}
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 14, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiOutlineAdjustments style={{ fontSize: '1rem' }} /> Choose Prediction Model
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {ALL_MODELS.map(m => (
                  <motion.div
                    key={m.key}
                    onClick={() => setModelType(m.key)}
                    title={m.desc}
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                    style={{
                      padding: '10px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      border: `1.5px solid ${modelType === m.key ? m.color : 'rgba(255,255,255,0.07)'}`,
                      background: modelType === m.key ? `${m.color}14` : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', marginBottom: 3 }}>{m.icon}</div>
                    <div style={{ color: modelType === m.key ? m.color : '#64748b', fontSize: '0.62rem', fontWeight: 600, lineHeight: 1.2 }}>{m.name}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick-Fill Templates Selector */}
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} className="text-amber-400" /> Quick-Fill Templates
                </span>
                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Apply predefined profiles</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { key: 'high_risk', label: 'High Risk', icon: <AlertTriangle size={14} />, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.08)', activeBg: 'rgba(244, 63, 94, 0.16)' },
                  { key: 'medium_risk', label: 'Medium Risk', icon: <AlertCircle size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', activeBg: 'rgba(245, 158, 11, 0.16)' },
                  { key: 'low_risk', label: 'Low Risk', icon: <CheckCircle size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', activeBg: 'rgba(16, 185, 129, 0.16)' }
                ].map(t => {
                  const isActive = selectedTemplate === t.key;
                  return (
                    <motion.button
                      key={t.key}
                      type="button"
                      whileHover={{ scale: 1.02, translateY: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        applyTemplate(t.key);
                        setSelectedTemplate(t.key);
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        color: t.color,
                        background: isActive ? t.activeBg : 'rgba(255, 255, 255, 0.02)',
                        border: `1.5px solid ${isActive ? t.color : 'rgba(255, 255, 255, 0.06)'}`,
                        boxShadow: isActive ? `0 0 12px ${t.color}1e` : 'none',
                      }}
                    >
                      {t.icon}
                      {t.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Dynamic Form */}
            <form onSubmit={handleSubmit} noValidate>
              {schema.map((section, si) => (
                <div key={si} className="glass-card animate-fade-in-up" style={{ animationDelay: `${si * 80}ms`, marginBottom: 18 }}>
                  <h3 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {SECTION_ICONS[section.section] || <HiOutlineViewGrid style={{ fontSize: 16 }} />}
                    {section.section}
                  </h3>
                  <div className="predict-form-grid">
                    {section.fields.map(field => {
                      const displayLabel = field.label.replace('($)', `(${currentCurrency?.symbol || '$'})`);
                      const hasError = !!validationErrors[field.key];
                      
                      // Calculate currency scaled bounds for HTML5 attributes
                      const isCurrency = CURRENCY_KEYS.includes(field.key);
                      const localMin = field.min !== undefined ? (isCurrency ? Math.floor(field.min * currentCurrency.rate) : field.min) : undefined;
                      const localMax = field.max !== undefined ? (isCurrency ? Math.ceil(field.max * currentCurrency.rate) : field.max) : undefined;

                      return (
                        <div key={field.key} className="form-group" style={{ marginBottom: 16 }}>
                          <label className="form-label" style={{ color: hasError ? '#f43f5e' : 'var(--text-secondary)' }}>
                            {displayLabel}
                          </label>
                          
                          {field.type === 'select' && (
                            <select name={field.key} value={form[field.key] ?? ''} onChange={handleChange} className="form-select"
                              style={{ borderColor: hasError ? '#f43f5e' : 'var(--glass-border)' }}>
                              {field.options.map((opt, oi) => (
                                <option key={oi} value={opt}>{field.labels ? field.labels[oi] : String(opt)}</option>
                              ))}
                            </select>
                          )}
                          
                          {field.type === 'radio' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 6, minHeight: 38, alignItems: 'center' }}>
                              {field.options.map((opt, oi) => (
                                <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                  <input type="radio" name={field.key} value={opt} checked={form[field.key] === opt} onChange={handleChange}
                                    style={{ accentColor: '#8b5cf6', cursor: 'pointer' }} />
                                  {field.labels ? field.labels[oi] : String(opt)}
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {field.type === 'toggle' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, minHeight: 38 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const val = form[field.key] === 'Yes' ? 'No' : 'Yes';
                                  handleChange({ target: { name: field.key, value: val, type: 'text' } });
                                }}
                                style={{
                                  width: 44, height: 22, borderRadius: 12,
                                  background: form[field.key] === 'Yes' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: 0
                                }}
                              >
                                <div style={{
                                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                                  position: 'absolute', top: 2,
                                  left: form[field.key] === 'Yes' ? 24 : 3,
                                  transition: 'all 0.2s',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }} />
                              </button>
                              <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{form[field.key]}</span>
                            </div>
                          )}
                          
                          {field.type === 'slider' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, minHeight: 38 }}>
                              <input type="range" name={field.key} min={localMin} max={localMax} step={field.step || 1}
                                value={form[field.key] ?? localMin} onChange={handleChange}
                                style={{ flex: 1, accentColor: '#8b5cf6', cursor: 'pointer', height: 4, borderRadius: 2 }} />
                              <span style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                                {form[field.key]}
                              </span>
                            </div>
                          )}
                          
                          {field.type === 'number' && (
                            <input type="number" name={field.key} value={form[field.key] ?? ''} onChange={handleChange}
                              className="form-input" min={localMin} max={localMax} step={field.step || 1}
                              style={{ borderColor: hasError ? '#f43f5e' : 'var(--glass-border)' }} />
                          )}
                          
                          {hasError && (
                            <div style={{ color: '#f43f5e', fontSize: '0.72rem', marginTop: 4, fontWeight: 500 }}>
                              {validationErrors[field.key]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                style={{ width: '100%', background: `linear-gradient(135deg, ${industry?.color || '#8b5cf6'}, #8b5cf6)` }}>
                {loading ? (
                  <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Analyzing {industry?.label} Data...</>
                ) : (
                  <>Predict {industry?.label} Churn</>
                )}
              </button>
            </form>
          </div>

          {/* Right: Result Panel */}
          {result && (
            <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
              <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  <IndustryIcon industry={selectedIndustry} size={18} color="#94a3b8" />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                    {result.industry?.toUpperCase()} CHURN ANALYSIS
                  </span>
                </div>

                <div style={{
                  width: 160, height: 160, borderRadius: '50%', margin: '0 auto 16px',
                  background: `conic-gradient(${riskColor} ${(result.churn_probability * 360).toFixed(0)}deg, rgba(255,255,255,0.05) 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 40px ${riskColor}40`, position: 'relative',
                }}>
                  <div style={{
                    width: 130, height: 130, borderRadius: '50%', background: 'var(--bg-glass, #0f172a)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ color: riskColor, fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>
                      {(result.churn_probability * 100).toFixed(1)}%
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: 2 }}>churn risk</div>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 20px', borderRadius: 24,
                  background: `${riskColor}18`, border: `1.5px solid ${riskColor}40`,
                  color: riskColor, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12,
                }}>
                  {result.risk_level === 'High' ? '▲' : result.risk_level === 'Medium' ? '◈' : '✦'}
                  &nbsp;{result.risk_level} Risk — {result.churn_prediction === 1 ? 'Likely to Churn' : 'Likely to Stay'}
                </div>

                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Model: {result.model_used}</p>
              </div>

              {result.contributing_factors?.length > 0 && (
                <div className="glass-card animate-fade-in-up" style={{ marginBottom: 16 }}>
                  <h3 style={{ color: '#e2e8f0', marginBottom: 14, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HiOutlineSearchCircle style={{ fontSize: '1.1rem' }} /> Top Contributing Factors
                  </h3>
                  {result.contributing_factors.map((f, i) => (
                    <FactorBar key={i} factor={f} maxImportance={maxImportance} />
                  ))}
                </div>
              )}

              <div className="glass-card animate-fade-in-up" style={{ background: result.risk_level === 'High' ? 'rgba(244,63,94,0.05)' : result.risk_level === 'Medium' ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)', border: `1px solid ${riskColor}25` }}>
                <h3 style={{ color: riskColor, marginBottom: 12, fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {result.risk_level === 'High'
                    ? <><HiOutlineShieldExclamation style={{ fontSize: '1rem' }} /> Immediate Action</>
                    : result.risk_level === 'Medium'
                    ? <><HiOutlineLightningBolt style={{ fontSize: '1rem' }} /> Proactive Steps</>
                    : <><HiOutlineCheckCircle style={{ fontSize: '1rem' }} /> Maintain Engagement</>}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {getRecommendations(selectedIndustry, result.risk_level).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: '#cbd5e1' }}>
                      <span style={{ color: riskColor, flexShrink: 0 }}>–</span>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

                {/* Ask AI Button */}
                {onPredictionContext && (
                  <button
                    className="btn btn-primary"
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'var(--transition-normal)',
                    }}
                    onClick={() => {
                      onPredictionContext({
                        prediction_id: result.id,
                        churn_probability: result.churn_probability,
                        risk_level: result.risk_level,
                        model_used: result.model_used,
                        contributing_factors: result.contributing_factors || [],
                        industry: selectedIndustry,
                        chat_trigger_timestamp: Date.now(),
                        ...form,
                      });
                    }}
                  >
                    🪐 Ask AI About This Prediction
                  </button>
                )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: BENCHMARK ═══ */}
      {activeTab === 'benchmark' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card animate-fade-in-up">
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineChartBar style={{ fontSize: '1.1rem' }} /> Cross-Industry Churn Rate Benchmark
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={benchmarkData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="industry" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<BenchmarkTooltip />} />
                <Bar dataKey="avg_churn_rate" radius={[8, 8, 0, 0]} animationDuration={800}>
                  {benchmarkData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card animate-fade-in-up">
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineViewGrid style={{ fontSize: '1.1rem' }} /> Industry Risk Profiles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {INDUSTRIES.map(ind => (
                <div
                  key={ind.key}
                  style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: selectedIndustry === ind.key ? `${ind.color}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedIndustry === ind.key ? ind.color : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onClick={() => { handleIndustryChange(ind.key); setActiveTab('form'); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IndustryIcon industry={ind.key} size={22} color={ind.color} />
                      <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{ind.label}</span>
                    </div>
                    <span style={{ color: ind.color, fontWeight: 800, fontSize: '1.1rem' }}>{ind.avgChurn}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HiOutlineExclamation style={{ fontSize: '0.85rem' }} /> {ind.topRisk}
                  </div>
                  <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${parseFloat(ind.avgChurn)}%`, height: '100%', background: ind.gradient, borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card animate-fade-in-up" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineViewGrid style={{ fontSize: '1.1rem' }} /> Industry Risk Radar — Key Metrics Comparison
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={[
                { metric: 'Churn Rate', telecom: 26.5, banking: 20.4, ecommerce: 22.1, healthcare: 18.7 },
                { metric: 'Retention Cost', telecom: 33, banking: 75, ecommerce: 12.5, healthcare: 100 },
                { metric: 'Predict Accuracy', telecom: 87, banking: 82, ecommerce: 79, healthcare: 76 },
                { metric: 'Avg Tenure Risk', telecom: 65, banking: 45, ecommerce: 70, healthcare: 40 },
                { metric: 'Seasonal Volatility', telecom: 30, banking: 20, ecommerce: 80, healthcare: 15 },
              ]} margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar name="Telecom" dataKey="telecom" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                <Radar name="Banking" dataKey="banking" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Radar name="E-commerce" dataKey="ecommerce" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                <Radar name="Healthcare" dataKey="healthcare" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, fontSize: '0.78rem' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ TAB: INSIGHTS ═══ */}
      {activeTab === 'insights' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {INDUSTRIES.map((ind, idx) => (
            <div
              key={ind.key}
              className="glass-card animate-fade-in-up"
              style={{
                animationDelay: `${idx * 80}ms`,
                borderTop: `3px solid ${ind.color}`,
                cursor: 'pointer',
              }}
              onClick={() => { handleIndustryChange(ind.key); setActiveTab('form'); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <IndustryIcon industry={ind.key} size={32} color={ind.color} />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.05rem' }}>{ind.label}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{ind.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ color: ind.color, fontWeight: 800, fontSize: '1.4rem' }}>{ind.avgChurn}</div>
                  <div style={{ color: '#64748b', fontSize: '0.68rem' }}>avg churn</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Risk Factors
                </div>
                {getIndustryRiskFactors(ind.key).map((factor, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ color: ind.color, fontSize: '0.7rem' }}>›</span>
                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{factor}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {getIndustryStats(ind.key).map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ color: ind.color, fontWeight: 700, fontSize: '0.95rem' }}>{stat.value}</div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: '8px 12px', background: `${ind.color}0d`, border: `1px solid ${ind.color}25`, borderRadius: 8, fontSize: '0.75rem', color: ind.color, fontWeight: 600 }}>
                Analyze {ind.label} customers →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Static helpers ────────────────────────────────────────────────────────── */

function getRecommendations(industry, riskLevel) {
  const map = {
    telecom: {
      High: ['Offer contract upgrade with 3-month discount', 'Assign dedicated customer success rep', 'Proactively resolve any outstanding support tickets', 'Bundle additional services to increase switching cost'],
      Medium: ['Send personalized email with loyalty rewards', 'Offer optional service add-ons at discounted rate', 'Schedule proactive check-in call'],
      Low: ['Maintain current engagement cadence', 'Invite to referral/loyalty program', 'Upsell premium services opportunistically'],
    },
    banking: {
      High: ['Assign personal banker for high-touch outreach', 'Offer exclusive rate on savings product', 'Schedule financial wellness consultation', 'Provide exclusive credit card benefits'],
      Medium: ['Email campaign on new product offerings', 'Invite to financial planning webinar', 'Activate dormant digital banking features'],
      Low: ['Recognize loyalty with exclusive tier upgrade', 'Promote premium investment products', 'Encourage referral program participation'],
    },
    ecommerce: {
      High: ['Send win-back email with exclusive 30% discount', 'Trigger cart abandonment recovery sequence', 'Offer free shipping on next 3 orders', 'Assign VIP customer service agent'],
      Medium: ['Launch re-engagement email series', 'Provide personalized product recommendations', 'Offer loyalty points bonus for next purchase'],
      Low: ['Maintain subscription benefits & perks', 'Cross-sell complementary product categories', 'Invite to early-access product launches'],
    },
    healthcare: {
      High: ['Outreach call from care coordinator within 48hrs', 'Offer telehealth appointment scheduling', 'Review and simplify billing/payment plan', 'Connect with patient navigator for support'],
      Medium: ['Send appointment reminder sequence', 'Offer flexible scheduling options', 'Share personalized health education materials'],
      Low: ['Continue annual preventive care reminders', 'Enroll in patient loyalty/wellness program', 'Encourage peer referrals to the practice'],
    },
  };
  return (map[industry]?.[riskLevel] || []).slice(0, 4);
}

function getIndustryRiskFactors(industry) {
  const map = {
    telecom: ['Month-to-month contract holders', 'Electronic check payment users', 'Fiber optic without security add-ons', 'Low tenure (< 12 months)', 'Senior citizens without partner'],
    banking: ['Inactive members (not using services)', 'Single product holders', 'Low credit score (< 500)', 'Age 40–60 demographic', 'Germany geography segment'],
    ecommerce: ['No purchases in last 90+ days', 'High cart abandonment (> 70%)', 'Low email open rate (< 10%)', 'Free tier subscribers', 'Multiple support tickets'],
    healthcare: ['3+ appointment no-shows in 12mo', 'No visit in 6+ months', 'Low satisfaction score (≤ 4)', 'Uninsured or self-pay patients', 'No chronic care plan'],
  };
  return map[industry] || [];
}

function getIndustryStats(industry) {
  const map = {
    telecom: [{ value: '7', label: 'ML Models' }, { value: '19', label: 'Features' }, { value: '87%', label: 'Accuracy' }],
    banking: [{ value: '3', label: 'Geographies' }, { value: '10', label: 'Features' }, { value: '82%', label: 'Accuracy' }],
    ecommerce: [{ value: '4', label: 'Loyalty Tiers' }, { value: '10', label: 'Features' }, { value: '79%', label: 'Accuracy' }],
    healthcare: [{ value: '4', label: 'Insurance Types' }, { value: '10', label: 'Features' }, { value: '76%', label: 'Accuracy' }],
  };
  return map[industry] || [];
}
