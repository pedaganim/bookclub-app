# BookClub Frontend

This is the React frontend for the BookClub application, featuring a modern, responsive design for managing book collections.

## Features

### Enhanced Book Upload
- **📷 Camera Integration**: Take photos of book covers directly from your device
- **📁 File Upload**: Upload existing images from your device
- **🔍 OCR Technology**: Automatic text extraction from book cover images using Tesseract.js
- **⚡ Auto-Population**: Automatically fills in book details (title, author, description) from extracted text
- **🔗 Metadata Enrichment**: Integrates with Google Books API and Open Library for additional book information
- **✏️ Manual Editing**: Full control to edit auto-populated fields before saving

### Core Functionality
- User authentication with AWS Cognito
- Book CRUD operations
- Image upload to S3
- Responsive design with Tailwind CSS
- Real-time updates

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## Image Scan/Upload Feature

### How It Works

1. **Image Capture**: Users can either take a photo using their device camera or upload an existing image
2. **OCR Processing**: The image is processed using Tesseract.js to extract text content
3. **Text Analysis**: Extracted text is analyzed to identify book title, author, and ISBN
4. **Metadata Lookup**: If an ISBN is found, the app queries Google Books API or Open Library for detailed information
5. **Auto-Population**: Form fields are automatically filled with extracted and enriched data
6. **User Review**: Users can edit any auto-populated fields before saving

### Technical Implementation

- **Client-side OCR**: Uses Tesseract.js for text extraction to avoid backend complexity
- **Camera API**: Leverages HTML5 `navigator.mediaDevices.getUserMedia` for photo capture
- **Progressive Enhancement**: Gracefully degrades to manual entry if automated features fail
- **Error Handling**: Comprehensive error handling for camera access, OCR processing, and network issues
- **Performance**: Lazy loading of OCR engine and efficient image processing

### Dependencies

- `tesseract.js`: Client-side OCR text extraction
- `react`: UI framework
- `tailwindcss`: Styling
- Existing backend APIs for metadata and file upload
