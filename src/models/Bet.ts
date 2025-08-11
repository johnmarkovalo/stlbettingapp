interface Bet {
  id?: number;
  transid?: number;
  tranno: number;
  betNumber: string;
  betNumberr?: string;
  targetAmount: number;
  rambolAmount: number;
  subtotal: number;
  status?: string;
  created_at?: string;
}

export default Bet;
