module tb_motor_top;
	reg clk;
	reg rst;
	reg [1:0] speed_sel;
	reg dir_sel;
	reg enable_sw;
	wire pwm_out;
	wire in1;
	wire in2;
	wire motor_en;

	motor_top uut (
		.clk(clk),
		.rst(rst),
		.speed_sel(speed_sel),
		.dir_sel(dir_sel),
		.enable_sw(enable_sw),
		.pwm_out(pwm_out),
		.in1(in1),
		.in2(in2),
		.motor_en(motor_en)
	);

	always #5 clk = ~clk;

	initial begin
		clk = 1'b0;
		rst = 1'b1;
		speed_sel = 2'b00;
		dir_sel = 1'b0;
		enable_sw = 1'b0;

		#20 rst = 1'b0;
		#20 enable_sw = 1'b1;

		#5000 speed_sel = 2'b00;
		#5000 speed_sel = 2'b01;
		#5000 speed_sel = 2'b10;
		#5000 speed_sel = 2'b11;

		#5000 dir_sel = 1'b1;
		#5000 dir_sel = 1'b0;

		#5000 enable_sw = 1'b0;
		#5000;
		$finish;
	end
endmodule