"""
Define patterns for identifying different types of requests in messages.
"""

import re

# Request type patterns with associated metadata
REQUEST_PATTERNS = [
    {
        'pattern': re.compile(r'add.*?webhook.*?fluent', re.IGNORECASE),
        'type': 'Form Integration',
        'category': 'Forms',
        'default_effort': 'Small',
        'keywords': ['webhook', 'fluent', 'integration']
    },
    {
        'pattern': re.compile(r'gravity form.*?webhook', re.IGNORECASE),
        'type': 'Form Integration',
        'category': 'Forms',
        'default_effort': 'Small',
        'keywords': ['gravity', 'form', 'webhook']
    },
    {
        'pattern': re.compile(r'nameserver.*?cutover', re.IGNORECASE),
        'type': 'DNS Cutover',
        'category': 'DNS',
        'default_effort': 'Medium',
        'keywords': ['nameserver', 'dns', 'cutover']
    },
    {
        'pattern': re.compile(r'migrat.*?(site|website)', re.IGNORECASE),
        'type': 'Site Migration',
        'category': 'Hosting',
        'default_effort': 'Large',
        'keywords': ['migrate', 'migration', 'transfer']
    },
    {
        'pattern': re.compile(r'backup|zip.*?site', re.IGNORECASE),
        'type': 'Backup Request',
        'category': 'Hosting',
        'default_effort': 'Medium',
        'keywords': ['backup', 'zip', 'archive']
    },
    {
        'pattern': re.compile(r'remove.*?form', re.IGNORECASE),
        'type': 'Form Removal',
        'category': 'Forms',
        'default_effort': 'Small',
        'keywords': ['remove', 'delete', 'form']
    },
    {
        'pattern': re.compile(r'please use this email', re.IGNORECASE),
        'type': 'Email Routing',
        'category': 'Email',
        'default_effort': 'Small',
        'keywords': ['email', 'routing', 'leads']
    },
    {
        'pattern': re.compile(r'update.*?license', re.IGNORECASE),
        'type': 'License Update',
        'category': 'Billing',
        'default_effort': 'Small',
        'keywords': ['license', 'update', 'renewal']
    },
    {
        'pattern': re.compile(r'can you.*?(add|create|update|fix|check)', re.IGNORECASE),
        'type': 'General Request',
        'category': 'Support',
        'default_effort': 'Medium',
        'keywords': ['request', 'help', 'support']
    },
    {
        'pattern': re.compile(r'need(s)?\s+(to|you|help)', re.IGNORECASE),
        'type': 'General Request',
        'category': 'Support',
        'default_effort': 'Medium',
        'keywords': ['need', 'help', 'assistance']
    }
]

# Urgency indicators
URGENCY_INDICATORS = {
    'high': ['urgent', 'asap', 'immediately', 'today', 'critical', 'emergency', '100% by'],
    'low': ['when you can', 'no rush', 'whenever', 'eventually'],
    'medium': []  # Default
}

# Action keywords for general detection
ACTION_KEYWORDS = [
    'please', 'can you', 'could you', 'need', 'add', 'update', 'fix',
    'create', 'setup', 'configure', 'install', 'remove', 'delete',
    'check', 'review', 'test', 'migrate', 'backup'
]

# Work-related keywords
WORK_KEYWORDS = [
    'website', 'site', 'domain', 'dns', 'nameserver', 'hosting',
    'form', 'webhook', 'email', 'leads', 'tag', 'pixel', 'analytics',
    'wordpress', 'elementor', 'plugin', 'staging', 'migration',
    'backup', 'license', 'credential', 'login', 'password'
]

# Exclusion patterns for non-requests (conversational messages)
EXCLUSION_PATTERNS = [
    re.compile(r'^all good', re.IGNORECASE),
    re.compile(r'^got it', re.IGNORECASE),
    re.compile(r'^perfect', re.IGNORECASE),
    re.compile(r'^thanks?$', re.IGNORECASE),
    re.compile(r'^thank you', re.IGNORECASE),
    re.compile(r'^ok$', re.IGNORECASE),
    re.compile(r'^okay$', re.IGNORECASE),
    re.compile(r'^yes$', re.IGNORECASE),
    re.compile(r'^no$', re.IGNORECASE),
    re.compile(r'^sounds good', re.IGNORECASE),
    re.compile(r'^works for me', re.IGNORECASE),
    re.compile(r'^let me know', re.IGNORECASE),
    re.compile(r'just wanted to (let you know|update|mention)', re.IGNORECASE),
    re.compile(r'got some .* that might', re.IGNORECASE),  # "got some big moves that might need to happen"
    re.compile(r'^i\'ll (call|text|email)', re.IGNORECASE),
    re.compile(r'^just (called|texted|emailed)', re.IGNORECASE),
    re.compile(r'respectfully', re.IGNORECASE),
    re.compile(r'^sorry to bother', re.IGNORECASE),
    # Note: Removed "good morning" and "good afternoon" as these often precede actual requests
    re.compile(r'^lol$', re.IGNORECASE),
    re.compile(r'^haha', re.IGNORECASE),
]

# Conversational phrases that indicate non-requests
NON_REQUEST_PHRASES = [
    'all good', 'got it', 'perfect', 'sounds good', 'works for me',
    'let me know', 'just wanted to update', 'just fyi', 'heads up',
    'by the way', 'btw', 'just so you know', 'for what it\'s worth'
]