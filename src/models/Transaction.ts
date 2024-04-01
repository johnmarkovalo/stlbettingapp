interface Transaction {
  id?: number;
  ticketcode: string;
  keycode?: string;
  trans_data?: string;
  betdate: string;
  betdraw: number;
  bettime: string;
  bettypeid: number;
  trans_no: number;
  declared_gross?: number;
  remarks?: string;
  gateway: string;
  status: string;
  synced: boolean;
}

export default Transaction;
