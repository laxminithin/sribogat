# KissanBandi - E-commerce Platform for Fresh Produce

## Overview

KissanBandi is a full-stack e-commerce platform designed to connect farmers directly with consumers, providing a seamless way to buy fresh produce, fruits, and vegetables online. The platform is built using React for the frontend and Node.js with Express for the backend, with MongoDB as the database.

## Key Features

*   **Product Catalog:** Browse and search for products with detailed information, including categories, subcategories, prices, and stock levels.
*   **Shopping Cart:** Manage your cart, adjust quantities, and proceed to checkout.
*   **Checkout Process:** Securely place orders with delivery details and payment integration.
*   **User Authentication:** Register, log in, and manage your profile and order history.
*   **Admin Panel:** A dedicated admin interface for managing products, orders, users, and other aspects of the platform.
*   **RESTful API:** A robust backend API for managing data and handling requests.

## Technologies Used

### Frontend

*   **React:** A JavaScript library for building user interfaces.
*   **Vite:** A fast build tool for modern web development.
*   **Tailwind CSS:** A utility-first CSS framework for styling.
*   **React Router:** For navigation and routing.
*   **Context API:** For state management.
*   **Lucide React:** For icons.

### Backend

*   **Node.js:** A JavaScript runtime environment.
*   **Express.js:** A web application framework for Node.js.
*   **MongoDB:** A NoSQL database for storing data.
*   **Mongoose:** An ODM (Object Data Modeling) library for MongoDB.
*   **JSON Web Tokens (JWT):** For authentication and authorization.
*   **Bcryptjs:** For password hashing.
*   **Nodemailer:** For sending emails.
*   **Cors:** For handling Cross-Origin Resource Sharing.
*   **Morgan:** For logging HTTP requests.
*   **Dotenv:** For managing environment variables.

## Project Structure

The project is organized into the following directories:

*   **`src`:** Contains all the source code for the frontend application.
    *   **`components`:** Reusable UI components.
    *   **`layouts`:** Layout components for structuring pages.
    *   **`pages`:** Page components and page-specific components.
        *   **`admin`:** Admin-specific pages and components.
        *   **`checkout`:** Checkout and cart functionality.
        *   **`home`:** Public-facing pages.
        *   **`auth`:** Authentication pages.
    *   **`routes`:** Route configurations.
    *   **`utils`:** Utility functions and API integration.
    *   **`context`:** Global state management.
    *   **`assets`:** Static resources.
*   **`backend`:** Contains the source code for the backend server.
    *   **`src`:** Backend application code.
        *   **`routes`:** API route definitions.
        *   **`controllers`:** Route handlers.
        *   **`middleware`:** Custom middleware.
        *   **`config`:** Configuration files.
        *   **`models`:** Data models.
*   **`scripts`:** Utility scripts for tasks like creating admin users.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn
*   MongoDB

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    ```
2.  Navigate to the project directory:

    ```bash
    cd Kissanbandi
    ```
3.  Install dependencies for the frontend:

    ```bash
    npm install
    ```
4.  Install dependencies for the backend:

    ```bash
    cd backend
    npm install
    ```
5.  Create a `.env` file in the root directory and in the `backend` directory and configure the environment variables.
6.  Start the development server:

    ```bash
    npm run dev
    ```
    (This will start both the frontend and backend servers)

## Contributing

Contributions are welcome! Please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with clear messages.
4.  Push your changes to your fork.
5.  Submit a pull request.

## License

This project is licensed under the MIT License.
