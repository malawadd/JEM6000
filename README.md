# JEM 6000: A Dynamic 3D Visualization of Fraxtal Network Transactions


### Introduction
Meet the JEM 6000, a cutting-edge dashboard designed to provide real-time visualization of Fraxtal Network blockchain transactions. Using a custom-built API, this project renders data onto a 3D globe, offering an immersive and interactive way to monitor blockchain activity.

### Features
**Real-Time Transaction Visualization:**
Monitor Fraxtal Network transactions in real-time, displayed dynamically on a 3D globe.

**Interactive 3D Globe:**
Explore blockchain activity with a visually engaging and interactive 3D globe interface.

### How It Works
JEM-6000 transforms complex blockchain data into an accessible and interactive experience through an innovative combination of technologies:

**Real-Time Data Fetching:**

Our custom-built API continuously supplies live transaction data from the Fraxtal Network blockchain. This real-time data feed ensures the dashboard reflects the most current blockchain activities.

**Data Processing:**

Once the data is fetched, it undergoes customized parsing to handle the large volumes efficiently. This ensures that the application remains responsive and performant, even under heavy data loads.

**3D Visualization:**

The core of the visual experience is built with Three.js and its extension, three-globe. These libraries render a fully interactive 3D globe where each transaction is mapped visually. The globe allows users to explore transactions spatially, providing a global perspective on Fraxtal Network activity.

**Interactive UI:**

Vue 3 powers the user interface, offering a reactive and composable component structure that ensures smooth interactions. Pinia manages the state of the application, making sure that data flows seamlessly between components without unnecessary re-renders.

**Dynamic Data Transformation:**

D3.js is used for intricate data visualizations, transforming raw data into meaningful visual formats. This includes charts and graphs that depict transaction trends.

**User Interaction:**

The interactive globe and data visualizations are not just for display; they are fully interactive. Users can click on different regions of the globe to drill down into transaction details.

**Elegant Styling:**

The application's styling is crafted with Sass, allowing for a flexible and maintainable CSS architecture. This ensures that the interface is not only functional but also visually appealing.

**Robust Navigation:**

Vue Router manages the navigation between different views and components within the application. This provides a smooth and intuitive user experience, allowing users to easily switch between viewing different types of transaction data.

**Reliable Time Management:**

Luxon handles all date and time formatting, ensuring that timestamps are accurate and presented in a user-friendly manner.

**Unique Data Identification:**

To maintain data integrity and consistency, uuid is used to generate unique identifiers for each transaction entry.

Through this sophisticated blend of technologies, JEM-6000 offers users an engaging and informative way to monitor blockchain activities, making complex data comprehensible and visually compelling.

### How To Use
**Backend:**
1. Navigate to the `backend` directory.
2. Run `npm install` to install the required packages.
3. Run `npm run start` to start the backend server.

**Client:**
1. Navigate to the `client` directory.
2. Run `npm install` to install the required packages.
3. Run `npm run dev` to start the client application.

### Technology Used
- **Vue 3:** A progressive JavaScript framework for building user interfaces.
- **Pinia:** A store for Vue applications, designed with the Composition API in mind.
- **Three.js:** JavaScript library for creating 3D graphics.
- **three-globe:** Library for creating interactive globes with Three.js.
- **D3.js:** Library for producing dynamic, interactive data visualizations in web browsers.
- **Sass:** CSS preprocessor for styling.
- **Luxon:** Library for working with dates and times.
- **uuid:** Library for generating unique identifiers.
- **Vue Router:** Official router for Vue.js.

### Credits
- **Three.js and three-globe:** For the 3D visualization tools.
- **D3.js:** For the data visualization capabilities.
- **Vue 3 and Pinia:** For the framework and state management.
- @vvuwei and @xdeq