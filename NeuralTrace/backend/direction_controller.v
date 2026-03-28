module direction_controller (
	input wire dir_sel,
	output reg in1,
	output reg in2
);
	always @(*) begin
		if (dir_sel) begin
			in1 = 1'b1;
			in2 = 1'b0;
		end else begin
			in1 = 1'b0;
			in2 = 1'b1;
		end
	end
endmodule