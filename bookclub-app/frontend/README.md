# BookClub Frontend

This is the React frontend for the BookClub application, featuring a modern, responsive design for managing book collections.

## Features

### Enhanced Book Upload
- **📷 Camera Integration**: Take photos of book covers directly from your device
- **📁 File Upload**: Upload existing images from your device
- **🔍 Advanced OCR Technology**: High-accuracy text extraction using optimized Tesseract.js with:
  - **🎯 Image Preprocessing**: Automatic image enhancement (resizing, grayscale conversion, denoising, sharpening)
  - **⚙️ Optimized Configuration**: Specialized settings for book cover text recognition
  - **📊 Confidence Scoring**: Real-time feedback on extraction accuracy with detailed confidence levels
  - **🔧 Fallback Handling**: Graceful error handling with fallback to original images
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
2. **Image Preprocessing**: Images are automatically enhanced for optimal OCR accuracy:
   - **Resizing**: Images are resized to optimal dimensions while maintaining aspect ratio
   - **Grayscale Conversion**: Color images are converted to grayscale for better text recognition
   - **Denoising**: Background noise is reduced to improve text clarity
   - **Sharpening**: Text edges are enhanced for better character recognition
3. **Advanced OCR Processing**: Enhanced Tesseract.js configuration for book cover text extraction:
   - **Optimized Page Segmentation**: Configured for uniform text blocks typical of book covers
   - **Neural Network Engine**: Uses LSTM neural network for superior accuracy
   - **Character Whitelist**: Restricted to common book cover characters for better precision
   - **High DPI Processing**: Enhanced resolution processing for crisp text recognition
4. **Confidence Assessment**: Real-time analysis of extraction quality with detailed feedback
5. **Text Analysis**: Extracted text is analyzed to identify book title, author, and ISBN
6. **Metadata Lookup**: If an ISBN is found, the app queries Google Books API or Open Library for detailed information
7. **Auto-Population**: Form fields are automatically filled with extracted and enriched data
8. **User Review**: Users can edit any auto-populated fields before saving

### Technical Implementation

- **Advanced OCR Pipeline**: Enhanced Tesseract.js implementation with comprehensive preprocessing
- **Image Processing**: Client-side image enhancement using HTML5 Canvas API
- **Optimized Configuration**: Specialized Tesseract parameters for book cover text recognition
- **Confidence Monitoring**: Real-time accuracy assessment with user feedback
- **Error Recovery**: Robust fallback mechanisms for preprocessing and OCR failures
- **Camera API**: Leverages HTML5 `navigator.mediaDevices.getUserMedia` for photo capture
- **Progressive Enhancement**: Gracefully degrades to manual entry if automated features fail
- **Performance**: Lazy loading of OCR engine and efficient image processing

### OCR Configuration Details

The OCR service uses optimized Tesseract.js settings:
- **Page Segmentation Mode**: Uniform block of text (PSM 6)
- **OCR Engine Mode**: Neural network LSTM (OEM 1)
- **Character Whitelist**: Limited to alphanumeric and common punctuation
- **DPI**: High-resolution processing at 300 DPI
- **Preprocessing**: Automatic image enhancement pipeline

### Dependencies

- `tesseract.js`: Client-side OCR text extraction
- `react`: UI framework
- `tailwindcss`: Styling
- Existing backend APIs for metadata and file upload
