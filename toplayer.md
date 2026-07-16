# Snagora Android App – Enterprise Offline Licensing (Phase 1)

You are an expert Android Architect and Kotlin developer.

Your task is to enhance my existing **offline-first Android application called Snagora**.

The application is used by technicians, site engineers, auditors, and inspectors to perform building snagging inspections completely offline.

The application already allows users to:

* Perform building inspections
* Inspect buildings, floors, rooms and services
* Capture inspection details
* Attach photographs
* Generate Excel reports offline
* Generate PDF reports offline
* Share reports
* Store inspection data locally

Do NOT modify or break any existing inspection functionality.

---

## Objective

Implement a secure enterprise licensing system while keeping the inspection workflow completely offline.

Internet should only be required for:

* First Registration
* Subscription Activation
* Monthly License Validation
* Subscription Renewal
* Version Check
* Downloading Updated APK

Everything else must work without internet.

---

# Authentication

On first launch:

Implement Google Sign-In.

After successful authentication collect:

* Full Name
* Company Name
* Email
* Mobile Number

Generate:

* Device UUID
* Android ID
* Device Model
* Manufacturer
* Android Version
* App Version

Register the device using the backend REST API.

Never communicate directly with the cloud database.

Only consume REST APIs.

---

# Subscription Activation

After registration the user must activate the application.

Provide two activation methods.

## Method 1

UPI Payment

After payment:

Call backend API.

If payment is verified:

Download license.

Store locally.

## Method 2

Coupon Code

User enters coupon.

Send to backend.

If valid:

Download license.

Store locally.

---

# License

The backend returns a signed encrypted license.

The app stores the license securely.

License contains:

* Customer ID
* Company ID
* Device ID
* Subscription Plan
* Report Credits
* Unlimited Reports Flag
* Activation Date
* Expiry Date
* Last Validation Date
* Minimum Supported Version
* Latest Version
* Force Update Flag
* Digital Signature

Validate the digital signature before accepting the license.

Never trust locally edited values.

---

# Offline Behaviour

After activation:

Everything works without internet.

User can:

* Create inspections
* Edit inspections
* Save inspections
* Capture Photos
* Generate Excel
* Generate PDF
* Share Reports

No network should be required.

---

# Monthly Validation

License remains valid for 28 days.

Store locally:

* Last Successful Validation
* License Expiry

After 28 days:

Require internet.

Authenticate.

Call backend.

Backend returns:

* Subscription Status
* New License
* Updated Credits
* Updated Expiry
* Version Information

Replace old license.

Continue offline for another 28 days.

If subscription expired:

Disable creation of new inspections.

Existing reports remain accessible.

---

# Version Check

Backend provides:

* Latest Version
* Minimum Supported Version
* Force Update Flag

Rules:

If installed version is below Minimum Supported Version

Block application.

Display:

"A newer version is required to continue."

Provide Update button.

If update is optional

Show:

"Update Available"

Allow user to continue.

---

# Report Credits

Backend decides:

Unlimited

or

Monthly Credits

When report is generated:

Decrease local credits.

During next validation:

Synchronize credits.

Prevent local manipulation.

---

# Security

Implement:

Encrypted Room Database

Encrypted SharedPreferences

JWT Authentication

Certificate Pinning

Play Integrity API

Root Detection

APK Signature Verification

Digital License Validation

Detect device time tampering.

Never rely only on the local clock for license expiry.

Protect against:

Modified APK

Replay attacks

License editing

Fake responses

Rooted devices

---

# API Layer

Assume backend APIs already exist.

Use Retrofit.

Consume APIs only.

Never access database directly.

Never perform admin operations.

Use Repository Pattern.

Handle:

Authentication

Registration

License

Subscription

Version Check

Heartbeat

Renewal

Gracefully handle network failures.

---

# Architecture

Follow:

Clean Architecture

MVVM

Repository Pattern

Dependency Injection using Hilt

Room Database

Retrofit

Kotlin Coroutines

StateFlow

Material Design 3

Offline-first design

---

# UI

Create modern enterprise UI.

Add:

Login Screen

Registration Screen

Subscription Activation Screen

Coupon Screen

Subscription Status Screen

Update Required Screen

License Expired Screen

Profile Screen

Settings Screen

Keep the inspection workflow unchanged.

---

# Error Handling

Handle:

No Internet

Expired Subscription

Invalid Coupon

Payment Failure

Unauthorized Device

Version Outdated

License Validation Failure

Corrupted Local License

Show user-friendly messages.

---

# Important Constraints

Do NOT build:

* Admin Panel
* Backend
* Cloud Database
* Payment Gateway Backend
* Analytics Dashboard
* Customer Management
* Company Management

Assume secure backend REST APIs already exist.

The Android application only consumes those APIs.

Focus only on creating a production-ready Android application with enterprise-grade offline licensing while preserving all existing inspection and report-generation functionality.
