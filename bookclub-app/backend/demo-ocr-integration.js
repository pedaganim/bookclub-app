#!/usr/bin/env node

/**
 * Demo script showing Google Books API integration with OCR text processing
 * This demonstrates the functionality implemented for issue #29
 */

const ocrService = require('./src/lib/ocr-service');
const bookMetadataService = require('./src/lib/book-metadata');

console.log('🔍 Google Books API + OCR Integration Demo\n');

// Simulate OCR-extracted text with common artifacts
const mockOcrTexts = [
  {
    name: 'Clean Book Text',
    text: `Clean Code
A Handbook of Agile Software Craftsmanship
Robert C. Martin
ISBN: 978-0-13-235088-4
Prentice Hall
2008`
  },
  {
    name: 'Noisy OCR Text',
    text: `C1ean C0de
A Handb00k 0f Ag|le S0ftware Craftsmanshlp
By R0bert C. Mart|n
ISBN-13: 978 0 13 235088 4`
  },
  {
    name: 'Minimal OCR Text',
    text: `The Pragmatic Programmer
Hunt Thomas
0201616221`
  }
];

async function demonstrateOCRProcessing() {
  for (const sample of mockOcrTexts) {
    console.log(`\n📄 Processing: ${sample.name}`);
    console.log('---'.repeat(20));
    
    // Step 1: Parse OCR text
    console.log('Raw OCR Text:');
    console.log(sample.text);
    
    const ocrResult = ocrService.parseBookDataFromText(sample.text);
    
    console.log('\n🔍 OCR Analysis:');
    console.log(`  📖 Title: ${ocrResult.title || 'Not found'}`);
    console.log(`  👤 Author: ${ocrResult.author || 'Not found'}`);
    console.log(`  📚 ISBN: ${ocrResult.isbn || 'Not found'}`);
    console.log(`  📊 Confidence: ${ocrResult.confidence}`);
    
    // Step 2: Search for metadata
    console.log('\n🌐 Searching for metadata...');
    
    let metadata = null;
    try {
      metadata = await bookMetadataService.searchBookMetadata({
        isbn: ocrResult.isbn,
        title: ocrResult.title,
        author: ocrResult.author
      });
      
      if (metadata) {
        console.log(`  ✅ Found metadata from: ${metadata.source}`);
        console.log(`  📖 Title: ${metadata.title}`);
        console.log(`  👤 Authors: ${metadata.authors?.join(', ')}`);
        console.log(`  📅 Published: ${metadata.publishedDate}`);
        console.log(`  📄 Pages: ${metadata.pageCount}`);
        console.log(`  🏷️  Categories: ${metadata.categories?.slice(0, 3).join(', ')}`);
      } else {
        console.log('  ℹ️  No metadata found (expected in sandboxed environment)');
      }
    } catch (error) {
      console.log(`  ⚠️  Metadata search failed: ${error.message}`);
    }
    
    // Step 3: Show book suggestions
    const suggestions = {
      title: metadata?.title || ocrResult.title,
      author: metadata?.authors?.[0] || ocrResult.author,
      isbn: metadata?.isbn13 || metadata?.isbn10 || ocrResult.isbn,
      description: metadata?.description,
      coverImage: metadata?.thumbnail,
      publisher: metadata?.publisher,
      publishedDate: metadata?.publishedDate,
      pageCount: metadata?.pageCount,
      categories: metadata?.categories
    };
    
    console.log('\n💡 Book Creation Suggestions:');
    console.log(`  📖 Title: ${suggestions.title || 'N/A'}`);
    console.log(`  👤 Author: ${suggestions.author || 'N/A'}`);
    console.log(`  📚 ISBN: ${suggestions.isbn || 'N/A'}`);
    console.log(`  📝 Description: ${suggestions.description ? suggestions.description.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`  🖼️  Cover: ${suggestions.coverImage ? 'Available' : 'N/A'}`);
  }
}

// Show OCR text cleaning capabilities
function demonstrateTextCleaning() {
  console.log('\n🧹 OCR Text Cleaning Demo');
  console.log('='.repeat(40));
  
  const dirtyTexts = [
    'C1ean C0de: A Handb00k',
    'R0bert C. Mart|n',
    'ISBN: 978-0-13-235-088-4',
    'Publ|shed |n 2008'
  ];
  
  dirtyTexts.forEach(dirty => {
    const clean = bookMetadataService.cleanOCRText(dirty);
    console.log(`  "${dirty}" → "${clean}"`);
  });
}

// Show ISBN extraction capabilities
function demonstrateISBNExtraction() {
  console.log('\n📚 ISBN Extraction Demo');
  console.log('='.repeat(40));
  
  const testTexts = [
    'ISBN: 978-0-13-235088-4',
    'ISBN-13: 978 0 13 235088 4',
    'ISBN10: 0132350882',
    '9780132350884',
    'Book code: 978-0132350884 for ordering'
  ];
  
  testTexts.forEach(text => {
    const isbn = ocrService.extractISBN(text);
    console.log(`  "${text}" → ${isbn || 'Not found'}`);
  });
}

// Main demo execution
async function runDemo() {
  try {
    console.log('This demo shows the OCR + Google Books API integration capabilities:');
    console.log('• OCR text parsing and cleaning');
    console.log('• ISBN extraction from various formats');
    console.log('• Book metadata lookup with fallback strategies');
    console.log('• Confidence scoring for OCR results');
    console.log('• Graceful handling of incomplete data\n');
    
    demonstrateTextCleaning();
    demonstrateISBNExtraction();
    await demonstrateOCRProcessing();
    
    console.log('\n🎉 Demo completed!');
    console.log('\nKey Features Implemented:');
    console.log('✅ OCR text extraction and parsing');
    console.log('✅ ISBN detection in multiple formats');
    console.log('✅ Title and author extraction with heuristics');
    console.log('✅ OCR artifact cleaning (0→O, 1→I, |→I, etc.)');
    console.log('✅ Google Books API integration with Open Library fallback');
    console.log('✅ Enhanced search with fuzzy matching for OCR errors');
    console.log('✅ 24-hour caching to reduce API costs');
    console.log('✅ Confidence scoring for extracted data');
    console.log('✅ Graceful degradation in sandboxed environments');
    console.log('✅ Complete API endpoint for image processing');
    console.log('✅ Frontend TypeScript integration');
    console.log('✅ Comprehensive test coverage');
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Run the demo
runDemo();