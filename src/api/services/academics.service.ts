import { api } from '../axios';
import type {  GetClassesResponse } from '../../types/academic';

export const academicsService = {
    getClasses:async():Promise<GetClassesResponse>=>{
        const response=await api.get('academics/classes');
        return response.data;
    },
};
