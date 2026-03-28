module speed_controller (
	input wire [1:0] speed_sel,
	output reg [7:0] duty
);
	always @(*) begin
		case (speed_sel)
			2'b00: duty = 8'd64;
			2'b01: duty = 8'd128;
			2'b10: duty = 8'd192;
			2'b11: duty = 8'd255;
			default: duty = 8'd0;
		endcase
	end
endmodule