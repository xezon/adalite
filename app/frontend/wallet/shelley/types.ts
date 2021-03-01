import {HexString, Lovelace} from '../../types'
import {TxCertificate, TxInput, TxOutput, TxWithdrawal} from '../types'

type encodeCBORFn = any // TODO: type

export type TxAux = {
  getId: () => HexString
  inputs: TxInput[]
  outputs: TxOutput[]
  fee: number
  ttl: number
  certificates: TxCertificate[]
  withdrawals: TxWithdrawal[]
  encodeCBOR: encodeCBORFn
}

export type CborizedTxSignedStructured = {
  getId: () => HexString
  encodeCBOR: encodeCBORFn
}

export type TxSigned = {
  txBody: HexString
  txHash: HexString
}

// TX

export const enum TxBodyKey {
  INPUTS = 0,
  OUTPUTS = 1,
  FEE = 2,
  TTL = 3,
  CERTIFICATES = 4,
  WITHDRAWALS = 5,
  META_DATA_HASH = 7,
}

export const enum TxWitnessKey {
  SHELLEY = 0,
  BYRON = 2,
}

export const enum TxCertificateKey {
  STAKING_KEY_REGISTRATION = 0,
  STAKING_KEY_DEREGISTRATION = 1,
  DELEGATION = 2,
  STAKEPOOL_REGISTRATION = 3,
}

export const enum TxRelayType {
  SINGLE_HOST_IP = 0,
  SINGLE_HOST_NAME = 1,
  MULTI_HOST_NAME = 2,
}

export type CborizedTxInput = [Buffer, number]

export type CborizedTxTokens = Map<Buffer, Map<Buffer, number>>

export type CborizedTxAmount = Lovelace | [Lovelace, CborizedTxTokens]

export type CborizedTxOutput = [Buffer, CborizedTxAmount]

export type CborizedTxWithdrawals = Map<Buffer, Lovelace>

export type CborizedTxStakingKeyRegistrationCert = [
  TxCertificateKey.STAKING_KEY_REGISTRATION,
  CborizedTxStakeCredential
]

export type CborizedTxStakingKeyDeregistrationCert = [
  TxCertificateKey.STAKING_KEY_DEREGISTRATION,
  CborizedTxStakeCredential
]

export type CborizedTxDelegationCert = [
  TxCertificateKey.DELEGATION,
  CborizedTxStakeCredential,
  Buffer
]

// prettier-ignore
export type CborizedTxSingleHostIPRelay = [
  TxRelayType.SINGLE_HOST_IP,
  number?,
  Buffer?,
  Buffer?,
]

export type CborizedTxSingleHostNameRelay = [TxRelayType.SINGLE_HOST_NAME, number, string]

export type TxMultiHostNameRelay = [TxRelayType.MULTI_HOST_NAME, string]

export type CborizedTxStakepoolRegistrationCert = [
  TxCertificateKey.STAKEPOOL_REGISTRATION,
  Buffer,
  Buffer,
  number,
  number,
  {
    value: {
      0: number
      1: number
    }
  },
  Buffer,
  Array<Buffer>,
  any,
  [string, Buffer]
]

export type CborizedTxCertificate =
  | CborizedTxDelegationCert
  | CborizedTxStakepoolRegistrationCert
  | CborizedTxStakingKeyDeregistrationCert
  | CborizedTxStakingKeyRegistrationCert

export type CborizedTxWitnessByron = [Buffer, Buffer, Buffer, Buffer]

export type CborizedTxWitnessShelley = [Buffer, Buffer]

export type CborizedTxSigned = [
  Map<TxBodyKey, any>,
  Map<TxWitnessKey, Array<CborizedTxWitnessByron | CborizedTxWitnessShelley>>,
  Buffer | null
]

export type CborizedTxUnsigned = [Map<TxBodyKey, any>, Buffer | null]

export type CborizedTxWitnesses = Map<
  TxWitnessKey,
  Array<CborizedTxWitnessByron | CborizedTxWitnessShelley>
>

export enum TxStakeCredentialType {
  ADDR_KEYHASH = 0,
  // SCRIPTHASH = 1,
}

export type CborizedTxStakeCredential = [TxStakeCredentialType, Buffer]