`timescale 1ns / 1ps

module tb_pwm_generator;
	parameter WIDTH = 8;
	parameter CLK_DIV = 20;

	reg clk;
	reg rst;
	reg [WIDTH-1:0] duty;
	wire pwm_out;

	pwm_generator #(
		.WIDTH(WIDTH),
		.CLK_DIV(CLK_DIV)
	) uut (
		.clk(clk),
		.rst(rst),
		.duty(duty),
		.pwm_out(pwm_out)
	);

	always #5 clk = ~clk;

	initial begin
		clk = 1'b0;
		rst = 1'b1;
		duty = 8'd0;

		#20 rst = 1'b0;

		#5000 duty = 8'd64;
		#5000 duty = 8'd128;
		#5000 duty = 8'd192;
		#5000 duty = 8'd255;
		#5000 duty = 8'd32;

		#5000;
		$finish;
	end
endmodule