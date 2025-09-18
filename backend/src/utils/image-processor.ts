import sharp from 'sharp';

export interface ProcessedImage {
	buffer: Buffer;
	contentType: string;
}

export async function processProfilePicture(inputBuffer: Buffer, mimeType: string): Promise<ProcessedImage> {
	try {
		const processedBuffer = await sharp(inputBuffer)
			.resize(200, 200, {
				fit: 'cover',
				position: 'center'
			})
			.jpeg({
				quality: 90,
				progressive: true
			})
			.toBuffer();

		return {
			buffer: processedBuffer,
			contentType: 'image/jpeg'
		};
	} catch (error) {
		console.error('Error processing profile picture:', error);
		throw new Error('Failed to process profile picture');
	}
}
