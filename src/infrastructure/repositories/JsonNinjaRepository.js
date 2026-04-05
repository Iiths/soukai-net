import ninjasData from '../../data/ninjas.json';
export class JsonNinjaRepository {
    async findAll() {
        return ninjasData;
    }
    async findById(id) {
        const ninja = ninjasData.find((n) => n.id === id);
        return ninja || null;
    }
}
