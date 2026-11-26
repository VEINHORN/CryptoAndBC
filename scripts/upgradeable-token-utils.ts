import {
  getAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

export const INITIAL_SUPPLY = 1_000_000n * 10n ** 18n;

export const TOKEN_INITIALIZER_ABI = [
  {
    type: "function",
    name: "initialize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "initialOwner", type: "address" },
      { name: "initialSupply", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const ADMIN_CHANGED_TOPIC = keccak256(
  stringToHex("AdminChanged(address,address)"),
);
const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;

type LogLike = {
  data: Hex;
  topics: readonly Hex[];
};

export function proxyAdminFromLogs(logs: readonly LogLike[]): Address {
  const adminChanged = logs.find((log) => log.topics[0] === ADMIN_CHANGED_TOPIC);
  if (adminChanged === undefined) {
    throw new Error("Proxy deployment did not emit AdminChanged");
  }

  return getAddress(`0x${adminChanged.data.slice(-40)}`);
}

export async function implementationAt(
  publicClient: { getStorageAt(args: { address: Address; slot: Hex }): Promise<Hex | undefined> },
  proxyAddress: Address,
): Promise<Address> {
  const storageValue = await publicClient.getStorageAt({
    address: proxyAddress,
    slot: IMPLEMENTATION_SLOT,
  });

  if (storageValue === undefined) {
    throw new Error("Unable to read the ERC-1967 implementation slot");
  }

  return getAddress(`0x${storageValue.slice(-40)}`);
}

export function requiredAddress(variable: string): Address {
  const value = process.env[variable];
  if (value === undefined) {
    throw new Error(`${variable} must be set`);
  }

  return getAddress(value);
}

export function sepoliaUrl(path: "address" | "tx", value: string): string {
  return `https://sepolia.etherscan.io/${path}/${value}`;
}
