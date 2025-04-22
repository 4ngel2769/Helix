import mongoose from 'mongoose';
import { container } from '@sapphire/framework';
// import { ColorResolvable, EmbedBuilder } from 'discord.js';
import config from '../../config';
import { Guild } from '../../models/Guild';
import { CustomMessage } from '../../models/customMessages';

// Add this type declaration to extend the Container interface
declare module '@sapphire/framework' {
    interface Container {
        database?: {
            isConnected: boolean;
            collections: string[];
        };
    }
}

/**
 * Initialize MongoDB connection
 * @returns Promise<boolean> True if connected, false otherwise
 */
export async function initializeDatabase(): Promise<boolean> {
    try {
        // Get MongoDB URI from config or environment
        const mongoUrl = process.env.MONGODB_URI || config.bot.mongoUri;
        
        if (!mongoUrl) {
            console.error('No MongoDB connection URL found in config or environment');
            return false;
        }
        
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log('MongoDB is already connected');
            return true;
        }
        
        // Connect to MongoDB with improved options
        await mongoose.connect(mongoUrl, {
            // Connection options are automatically handled in newer mongoose versions
        });
        
        console.log('Successfully connected to MongoDB');
        return true;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        return false;
    }
}

/**
 * Checks the MongoDB connection status
 * @returns Promise<boolean> True if connected, false otherwise
 */
export async function checkDatabaseConnection(): Promise<boolean> {
    // Check if mongoose is connected
    const isConnected = mongoose.connection.readyState === 1;
    
    if (!isConnected) {
        console.error('MongoDB is not connected! Connection state:', mongoose.connection.readyState);
        
        // Try to reconnect if not connected
        try {
            return await initializeDatabase();
        } catch (error) {
            console.error('Failed to reconnect to MongoDB:', error);
            return false;
        }
    }
    
    return true;
}

/**
 * Ensures required collections exist in the database
 * @returns Promise<string[]> List of verified collections
 */
export async function ensureCollectionsExist(): Promise<string[]> {
    try {
        // Get list of all collections
        const collections = await mongoose.connection.db?.listCollections().toArray();
        const collectionNames = collections?.map(c => c.name);
        
        console.log('Existing collections:', collectionNames);
        
        // Define required models and their initialization functions
        const requiredModels = [
            { name: 'guilds', model: Guild },
            { name: 'custommessages', model: CustomMessage }
        ];
        
        // Create a test document for each model that doesn't exist
        for (const { name, model } of requiredModels) {
            if (!collectionNames?.includes(name)) {
                console.log(`Collection '${name}' doesn't exist, initializing...`);
                
                // Create the collection by saving and then removing a test document
                const testDoc = new model({ 
                    guildId: 'test-initialization-' + Date.now(),
                    // Add any required fields here
                });
                
                await testDoc.save();
                await testDoc.deleteOne();
                
                console.log(`Successfully initialized collection '${name}'`);
            }
        }
        
        // Get updated list of collections
        const updatedCollections = await mongoose.connection.db?.listCollections().toArray();
        return updatedCollections?.map(c => c.name) || [];
    } catch (error) {
        console.error('Error ensuring collections exist:', error);
        return [];
    }
}

/**
 * Verifies database connection and logs status
 * Should be called during bot startup
 */
export async function verifyDatabaseConnection(): Promise<void> {
    try {
        // Initialize database connection
        const isConnected = await initializeDatabase();
        
        if (isConnected) {
            // Ensure collections exist
            const collections = await ensureCollectionsExist();
            
            // Store connection status in container for global access
            container.database = { 
                isConnected,
                collections
            };
            
            // const embed = new EmbedBuilder()
            //     .setTitle('Database Connection Status')
            //     .setColor(isConnected ? 
            //         (config.bot.embedColor.success as ColorResolvable) : 
            //         (config.bot.embedColor.err as ColorResolvable))
            //     .setDescription(isConnected ? 
            //         `✅ Connected to MongoDB successfully\nCollections: ${collections.join(', ')}` : 
            //         '❌ Failed to connect to MongoDB')
            //     .setTimestamp();
                
            console.log(isConnected ? 
                `✅ Connected to MongoDB successfully. Collections: ${collections.join(', ')}` : 
                '❌ Failed to connect to MongoDB');
        } else {
            container.database = { 
                isConnected: false,
                collections: []
            };
            
            console.error('❌ Failed to connect to MongoDB');
        }
    } catch (error) {
        console.error('Error verifying database connection:', error);
        container.database = { 
            isConnected: false,
            collections: []
        };
    }
}