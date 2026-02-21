
import mongoose from 'mongoose';
import { UrlModel } from '../models';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pa11y-dashboard';

const updateCivica = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const civicaId = '6991861e2689792d85b10a5a'; // From user request

        const actions = [
            { type: 'wait', value: '2000', label: 'Initial Wait' },
            { type: 'click', value: '#onetrust-accept-btn-handler', label: 'Accept Cookies' },
            { type: 'wait', value: '2000', label: 'Post-Click Wait' }
        ];

        const result = await UrlModel.findByIdAndUpdate(
            civicaId,
            { actions: actions },
            { new: true }
        );

        if (result) {
            console.log('Successfully updated Civica URL actions:', JSON.stringify(result.actions, null, 2));
        } else {
            console.error('Civica URL not found with ID:', civicaId);
        }

    } catch (error) {
        console.error('Error updating Civica URL:', error);
    } finally {
        await mongoose.disconnect();
    }
};

updateCivica();
