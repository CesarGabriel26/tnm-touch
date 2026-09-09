import { GenericData } from "../../types/generic"

export interface Complement extends GenericData {
    name: string;
    options: Array<{
        _id: string;
        name: string;
        price: number;
    } | any>;
    isRequired: boolean;
    maxSelection: number;
}
