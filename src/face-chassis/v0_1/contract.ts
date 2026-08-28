import contractDocument from "./contract.json";
import { chassisContractSchema } from "./schema";

export const chassisContract = chassisContractSchema.parse(contractDocument);

export default chassisContract;
